import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Nithinkumar Pedda',
    description: <>Blockchain Security Researcher | Smart Contract Auditor</>,
  },
  {
    title: 'Proficient In',
    description: <>.rs, .js, .py, .sol, .ts</>,
  },
  {
    title: 'Smart Contract Auditing',
    description: <>Finding bugs, fixing flaws, securing contracts(in Solidity and Rust).</>,
  },
  {
    title: 'Security Research and Analysis',
    description: <>Exploring threats, exposing exploits, enhancing security.</>,
  },
];

const UpdatesList = [
  'Addded new blog posts on Etereum protocols',
  'Upcoming Ethereum Lending Protocol project coming soon'


];

function Feature({ title, description }) {
  return (
    <div className={clsx('col col--6')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

function UpdatesBox() {
  return (
    <div className={clsx('col col--3')}>
      <div
        style={{
          backgroundColor: 'var(--ifm-background-surface-color)',
          border: '1px solid var(--ifm-color-emphasis-300)',
          padding: '1rem',
          borderRadius: '8px',
          boxShadow: 'var(--ifm-global-shadow-md)',
          fontSize: '0.85rem',
        }}
      >
        <Heading as="h4" style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>
          📢 Updates
        </Heading>
        <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
          {UpdatesList.map((update, idx) => (
            <li
              key={idx}
              style={{
                marginBottom: '0.5rem',
                paddingLeft: '1.25rem',
                position: 'relative',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  left: 0,
                }}
              >
                🔸
              </span>
              {update}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          <div className="col col--9">
            <div className="row">
              {FeatureList.map((props, idx) => (
                <Feature key={idx} {...props} />
              ))}
            </div>
          </div>
          <UpdatesBox />
        </div>
      </div>
    </section>
  );
}
