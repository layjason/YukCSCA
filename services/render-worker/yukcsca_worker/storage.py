"""S3-compatible object storage access for the worker (boto3)."""

from __future__ import annotations

import boto3
import botocore.config


class WorkerStorage:
    def __init__(
        self,
        endpoint: str,
        bucket: str,
        access_key: str,
        secret_key: str,
        auto_create_bucket: bool,
        region: str = "us-east-1",
    ) -> None:
        self.bucket = bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=endpoint or None,
            region_name=region,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=botocore.config.Config(
                s3={"addressing_style": "path"}, retries={"max_attempts": 3}
            ),
        )
        if auto_create_bucket:
            self._ensure_bucket()

    def _ensure_bucket(self) -> None:
        existing = self.client.list_buckets()
        names = {bucket["Name"] for bucket in existing.get("Buckets", [])}
        if self.bucket not in names:
            self.client.create_bucket(Bucket=self.bucket)

    def download(self, key: str, destination: str) -> None:
        self.client.download_file(self.bucket, key, destination)

    def content_length(self, key: str) -> int:
        """Returns object size without downloading untrusted bytes to the worker disk."""
        response = self.client.head_object(Bucket=self.bucket, Key=key)
        return int(response["ContentLength"])

    def upload(self, key: str, source: str, content_type: str) -> None:
        extra_args = {"ContentType": content_type}
        self.client.upload_file(
            source, self.bucket, key, ExtraArgs=extra_args
        )

    def get_bytes(self, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def delete(self, key: str) -> None:
        """Idempotently deletes one private object; S3 treats a missing key as success."""
        self.client.delete_object(Bucket=self.bucket, Key=key)
