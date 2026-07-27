import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HomePage(): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <div className="home-page">
      <section className="home-hero">
        <div className="home-hero-inner">
          <h1>{t('public.home.heroTitle')}</h1>
          <p className="home-hero-subtitle">{t('public.home.heroSubtitle')}</p>
          <div className="home-hero-actions">
            <Link to="/register" className="btn-primary">
              {t('public.home.startFree')}
            </Link>
            <Link to="/products" className="btn-secondary">
              {t('public.home.viewProducts')}
            </Link>
          </div>
        </div>
      </section>

      <section className="home-section home-how-it-works" aria-labelledby="how-it-works-heading">
        <h2 id="how-it-works-heading">{t('public.home.howItWorks')}</h2>
        <ol className="home-steps">
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              1
            </span>
            <div>
              <h3>{t('public.home.step1Title')}</h3>
              <p>{t('public.home.step1Desc')}</p>
            </div>
          </li>
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              2
            </span>
            <div>
              <h3>{t('public.home.step2Title')}</h3>
              <p>{t('public.home.step2Desc')}</p>
            </div>
          </li>
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              3
            </span>
            <div>
              <h3>{t('public.home.step3Title')}</h3>
              <p>{t('public.home.step3Desc')}</p>
            </div>
          </li>
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              4
            </span>
            <div>
              <h3>{t('public.home.step4Title')}</h3>
              <p>{t('public.home.step4Desc')}</p>
            </div>
          </li>
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              5
            </span>
            <div>
              <h3>{t('public.home.step5Title')}</h3>
              <p>{t('public.home.step5Desc')}</p>
            </div>
          </li>
          <li className="home-step">
            <span className="home-step-number" aria-hidden="true">
              6
            </span>
            <div>
              <h3>{t('public.home.step6Title')}</h3>
              <p>{t('public.home.step6Desc')}</p>
            </div>
          </li>
        </ol>
      </section>

      <section className="home-section home-languages" aria-labelledby="languages-heading">
        <h2 id="languages-heading">{t('public.home.languageModel')}</h2>
        <p>{t('public.home.languageModelDesc')}</p>
        <div className="home-language-cards">
          <div className="home-lang-card">
            <h3>{t('public.home.mathEnglish')}</h3>
            <p>{t('public.home.mathEnglishDesc')}</p>
          </div>
          <div className="home-lang-card">
            <h3>{t('public.home.mathChinese')}</h3>
            <p>{t('public.home.mathChineseDesc')}</p>
          </div>
        </div>
      </section>

      <section className="home-section home-trial" aria-labelledby="trial-heading">
        <h2 id="trial-heading">{t('public.home.trialTitle')}</h2>
        <p>{t('public.home.trialDesc')}</p>
        <ul className="home-trial-list">
          <li>{t('public.home.trialItem1')}</li>
          <li>{t('public.home.trialItem2')}</li>
          <li>{t('public.home.trialItem3')}</li>
        </ul>
        <Link to="/trial" className="btn-secondary">
          {t('public.home.learnMoreTrial')}
        </Link>
      </section>

      <section className="home-section home-parents" aria-labelledby="parents-heading">
        <h2 id="parents-heading">{t('public.home.parentTitle')}</h2>
        <p>{t('public.home.parentDesc')}</p>
        <Link to="/for-parents" className="btn-secondary">
          {t('public.home.forParents')}
        </Link>
      </section>

      <section className="home-section home-trust" aria-labelledby="trust-heading">
        <h2 id="trust-heading">{t('public.home.trustTitle')}</h2>
        <ul className="home-trust-list">
          <li>{t('public.home.trustItem1')}</li>
          <li>{t('public.home.trustItem2')}</li>
          <li>{t('public.home.trustItem3')}</li>
        </ul>
      </section>
    </div>
  );
}
