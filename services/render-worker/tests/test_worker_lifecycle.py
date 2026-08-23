"""Worker lifecycle regressions that do not require the render stack."""

from __future__ import annotations

import os
import ast
import multiprocessing
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import unittest
from unittest.mock import ANY, patch

from yukcsca_worker import jobs, process_control, validate_upload
from yukcsca_worker.config import WorkerConfig


class WorkerConfigurationTest(unittest.TestCase):
    def test_visibility_lease_outlives_hard_render_timeout(self):
        with patch.dict(
            os.environ,
            {
                "WORKER_RENDER_TIMEOUT_SECONDS": "900",
                "WORKER_VISIBILITY_TIMEOUT_SECONDS": "600",
                "WORKER_MAX_ATTEMPTS": "99",
            },
            clear=False,
        ):
            config = WorkerConfig.from_env()
        self.assertEqual(config.render_timeout_seconds, 900)
        self.assertGreaterEqual(config.visibility_timeout_seconds, 960)
        self.assertEqual(config.max_attempts, 5)

    def test_spawn_entrypoint_is_module_level(self):
        source = Path(__file__).parents[1] / "yukcsca_worker" / "worker.py"
        module = ast.parse(source.read_text(encoding="utf-8"))
        top_level_functions = {
            node.name for node in module.body if isinstance(node, ast.FunctionDef)
        }
        self.assertIn("_child_entry", top_level_functions)
        source_text = source.read_text(encoding="utf-8")
        self.assertNotIn("str(exception)", source_text)
        self.assertIn("except psycopg.Error", source_text)
        self.assertIn("storage.delete(claim.storage_key)", source_text)
        self.assertNotIn("media.object.deleted storageKey=", source_text)
        self.assertIn("process_control.establish_process_group()", source_text)
        self.assertIn("process_control.terminate_process_group(process)", source_text)


class UploadSizeGateTest(unittest.TestCase):
    def test_oversized_object_is_rejected_before_download(self):
        claimed = jobs.ClaimedJob(
            id="00000000-0000-0000-0000-000000000001",
            kind="VALIDATE_UPLOAD",
            scene_specification_id=None,
            video_asset_id="00000000-0000-0000-0000-000000000002",
            scene_snapshot=None,
            registry_version=None,
            attempts=1,
        )

        class Storage:
            def content_length(self, _key):
                return 209_715_201

            def download(self, *_args):
                raise AssertionError("oversized object must not be downloaded")

        asset = {
            "id": claimed.video_asset_id,
            "source": "UPLOADED",
            "status": "AWAITING_VALIDATION",
            "explanation_language": "id",
            "storage_key": "video-uploads/test",
            "captions_key": None,
        }
        with (
            patch.object(jobs, "load_asset", return_value=asset),
            patch.object(jobs, "complete_upload_rejection") as rejected,
        ):
            result = validate_upload.run(claimed, Storage(), object())

        self.assertEqual(result, claimed.video_asset_id)
        rejected.assert_called_once_with(
            ANY,
            claimed.id,
            claimed.attempts,
            claimed.video_asset_id,
            [("byteSize", "OUT_OF_RANGE")],
        )

    def test_unremuxable_upload_is_rejected_instead_of_stranded(self):
        claimed = jobs.ClaimedJob(
            id="00000000-0000-0000-0000-000000000001",
            kind="VALIDATE_UPLOAD",
            scene_specification_id=None,
            video_asset_id="00000000-0000-0000-0000-000000000002",
            scene_snapshot=None,
            registry_version=None,
            attempts=1,
        )

        class Storage:
            def content_length(self, _key):
                return 12

            def download(self, _key, destination):
                Path(destination).write_bytes(b"\x00\x00\x00\x0cftypmp42")

        probe_result = subprocess.CompletedProcess(
            args=["ffprobe"],
            returncode=0,
            stdout=(
                '{"format":{"format_name":"mov,mp4","duration":"1.0"},'
                '"streams":[{"codec_type":"video","width":640,"height":360}]}'
            ),
        )
        asset = {
            "id": claimed.video_asset_id,
            "source": "UPLOADED",
            "status": "AWAITING_VALIDATION",
            "explanation_language": "id",
            "storage_key": "video-uploads/test",
            "captions_key": None,
        }
        with (
            patch.object(jobs, "load_asset", return_value=asset),
            patch.object(jobs, "complete_upload_rejection") as rejected,
            patch.object(
                validate_upload.subprocess,
                "run",
                side_effect=[
                    probe_result,
                    subprocess.CalledProcessError(1, ["ffmpeg"]),
                ],
            ),
        ):
            result = validate_upload.run(claimed, Storage(), object())

        self.assertEqual(result, claimed.video_asset_id)
        rejected.assert_called_once_with(
            ANY,
            claimed.id,
            claimed.attempts,
            claimed.video_asset_id,
            [("container", "UNSUPPORTED")],
        )


def _process_group_with_term_ignoring_descendant(ready_path, survived_path):
    process_control.establish_process_group()
    code = (
        "import pathlib,signal,time;"
        "signal.signal(signal.SIGTERM, signal.SIG_IGN);"
        f"pathlib.Path({ready_path!r}).write_text('ready');"
        "time.sleep(1);"
        f"pathlib.Path({survived_path!r}).write_text('survived')"
    )
    subprocess.Popen([sys.executable, "-c", code])
    time.sleep(30)


class ProcessGroupTest(unittest.TestCase):
    def test_sigkill_fallback_reaches_descendant_after_leader_exits(self):
        with tempfile.TemporaryDirectory() as directory:
            ready = os.path.join(directory, "ready")
            survived = os.path.join(directory, "survived")
            context = multiprocessing.get_context("spawn")
            leader = context.Process(
                target=_process_group_with_term_ignoring_descendant,
                args=(ready, survived),
            )
            leader.start()
            deadline = time.monotonic() + 5
            while not os.path.exists(ready) and time.monotonic() < deadline:
                time.sleep(0.02)
            self.assertTrue(os.path.exists(ready))

            process_control.terminate_process_group(
                leader, term_grace_seconds=0.2, kill_grace_seconds=0.2
            )
            time.sleep(1.1)

            self.assertFalse(leader.is_alive())
            self.assertFalse(os.path.exists(survived))
if __name__ == "__main__":
    unittest.main()
