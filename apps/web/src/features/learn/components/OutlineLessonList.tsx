import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { resolveLocalizedText } from '../localizedText';
import { coverageLabelKey } from '../progressHelpers';
import type { AcademicSubject, SyllabusOutlineNode } from '../types';
import { ContentProgressFrom } from './ContentProgressChip';

interface OutlineLessonListProps {
  subject: AcademicSubject;
  outline: SyllabusOutlineNode[];
}

interface OutlineTreeNode extends SyllabusOutlineNode {
  children: OutlineTreeNode[];
}

export function OutlineLessonList({ subject, outline }: OutlineLessonListProps): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const tree = buildOutlineTree(outline);

  if (outline.length === 0) {
    return (
      <section
        className="learn-outline empty-state state-notice state-notice-info"
        aria-live="polite"
      >
        <h2>{t('learn.browse.emptyOutlineTitle')}</h2>
        <p>{t('learn.browse.emptyOutlineDescription')}</p>
      </section>
    );
  }

  return (
    <section className="learn-outline" aria-labelledby="learn-outline-heading">
      <h2 id="learn-outline-heading">{t('learn.browse.outlineTitle')}</h2>
      <ol className="learn-outline-tree" role="list">
        {tree.map((node) => (
          <OutlineNodeItem
            key={node.id}
            node={node}
            subject={subject}
            interfaceLanguage={i18n.language}
            depth={0}
          />
        ))}
      </ol>
    </section>
  );
}

function OutlineNodeItem({
  node,
  subject,
  interfaceLanguage,
  depth,
}: {
  node: OutlineTreeNode;
  subject: AcademicSubject;
  interfaceLanguage: string;
  depth: number;
}): React.JSX.Element {
  const { t } = useTranslation();
  const summary =
    resolveLocalizedText(node.summary, interfaceLanguage) || t('learn.browse.untitledTopic');

  return (
    <li className={`learn-outline-node depth-${Math.min(depth, 3)}`}>
      <div className="learn-outline-node-header">
        <div className="learn-outline-node-title-row">
          <h3 className="learn-outline-node-title">{summary}</h3>
          <span
            className={`learn-coverage-chip learn-coverage-${node.productCoverage.toLowerCase()}`}
          >
            {t(coverageLabelKey(node.productCoverage))}
          </span>
        </div>
      </div>

      {node.lessons.length > 0 ? (
        <ul className="learn-lesson-list" role="list">
          {node.lessons.map((lesson) => {
            const title =
              resolveLocalizedText(lesson.title, interfaceLanguage) ||
              t('learn.browse.untitledLesson');
            const progress = lesson.contentProgress;
            const isNext =
              progress.status === 'NOT_STARTED' ||
              progress.status === 'IN_PROGRESS' ||
              progress.updatedSinceCompleted;
            return (
              <li key={lesson.resourceId} className="learn-lesson-row">
                <Link
                  to={`/app/learn/${subject}/lessons/${lesson.resourceId}`}
                  className={`learn-lesson-link${isNext && progress.status !== 'CONTENT_COMPLETE' ? ' learn-lesson-link-next' : ''}${progress.updatedSinceCompleted ? ' learn-lesson-link-updated' : ''}`}
                >
                  <span className="learn-lesson-link-text">
                    <span className="learn-lesson-link-title">{title}</span>
                    <ContentProgressFrom progress={progress} />
                  </span>
                  <ChevronRight size={18} aria-hidden="true" className="learn-lesson-chevron" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}

      {node.children.length > 0 ? (
        <ol className="learn-outline-children" role="list">
          {node.children.map((child) => (
            <OutlineNodeItem
              key={child.id}
              node={child}
              subject={subject}
              interfaceLanguage={interfaceLanguage}
              depth={depth + 1}
            />
          ))}
        </ol>
      ) : null}
    </li>
  );
}

function buildOutlineTree(nodes: SyllabusOutlineNode[]): OutlineTreeNode[] {
  const byId = new Map<string, OutlineTreeNode>();
  for (const node of nodes) {
    byId.set(node.id, { ...node, children: [] });
  }
  const roots: OutlineTreeNode[] = [];
  const sorted = [...nodes].sort((a, b) => a.order - b.order);
  for (const node of sorted) {
    const current = byId.get(node.id);
    if (!current) continue;
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(current);
    } else {
      roots.push(current);
    }
  }
  for (const node of byId.values()) {
    node.children.sort((a, b) => a.order - b.order);
  }
  return roots;
}
