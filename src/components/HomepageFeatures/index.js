import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Nithinkumar Pedda',
    description: (
      <>
        Blockchain Security Researcher | Smart Contract Auditor
      </>
    ),
  },
  {
    title: 'Proficient In',
    description: (
      <>
        .rs, .js, .sol, .ts
      </>
    ),
  },
  {
    title: 'Smart Contract Auditing',
    description: (
      <>
        Finding bugs, fixing flaws, securing contracts.
      </>
    ),
  },
  {
    title: 'Security Research & Findings',
    description: (
      <>
        Exploring threats, exposing exploits, enhancing security.
      </>
    ),
  },
];

function Feature({ title, description }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
