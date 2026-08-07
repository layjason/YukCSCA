import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchPublishedAcademicImageObjectUrl } from '../api/learnApi';

interface LessonImageProps {
  imageId: string;
  altText: string;
  caption?: string | null;
}

/** Bearer-authenticated image for published student content; object URL lifecycle managed here. */
export function LessonImage(props: LessonImageProps): React.JSX.Element {
  return <LessonImageInner key={props.imageId} {...props} />;
}

function LessonImageInner({ imageId, altText, caption }: LessonImageProps): React.JSX.Element {
  const { t } = useTranslation();
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    void fetchPublishedAcademicImageObjectUrl(imageId)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageId]);

  if (failed) {
    return (
      <figure className="learn-image learn-image-failed">
        <div className="learn-image-placeholder" role="img" aria-label={altText}>
          {t('learn.lesson.imageUnavailable')}
        </div>
        {caption?.trim() ? <figcaption>{caption.trim()}</figcaption> : null}
      </figure>
    );
  }

  if (!src) {
    return (
      <figure className="learn-image learn-image-loading" aria-busy="true">
        <div className="learn-image-placeholder">
          <span className="loading-indicator" aria-hidden="true" />
          <span className="sr-only">{t('learn.lesson.imageLoading')}</span>
        </div>
      </figure>
    );
  }

  return (
    <figure className="learn-image">
      <img src={src} alt={altText} className="learn-image-img" loading="lazy" />
      {caption?.trim() ? <figcaption>{caption.trim()}</figcaption> : null}
    </figure>
  );
}
