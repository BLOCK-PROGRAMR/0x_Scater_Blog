
// import React, { useState } from 'react';

// const PasswordProtect = ({ children }) => {
//     const [password, setPassword] = useState('');
//     const [authenticated, setAuthenticated] = useState(false);

//     const correctPassword = 'NithiN@0987'; // Change this to your actual password

//     const handleSubmit = (e) => {
//         e.preventDefault();
//         if (password === correctPassword) {
//             setAuthenticated(true);
//         } else {
//             alert('Wrong password! Please try again.');
//         }
//     };

//     if (!authenticated) {
//         return (
//             <div
//                 style={{
//                     marginTop: '100px',
//                     maxWidth: '400px',
//                     marginLeft: 'auto',
//                     marginRight: 'auto',
//                     padding: '2rem',
//                     borderRadius: '12px',
//                     backgroundColor: 'var(--ifm-background-surface-color)',
//                     boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
//                     border: '1px solid var(--ifm-color-emphasis-300)',
//                 }}
//             >
//                 <h2
//                     style={{
//                         textAlign: 'center',
//                         marginBottom: '1.5rem',
//                         color: 'var(--ifm-heading-color)',
//                     }}
//                 >
//                     🔒 This page is protected
//                 </h2>
//                 <form onSubmit={handleSubmit}>
//                     <input
//                         type="password"
//                         placeholder="Enter password"
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         style={{
//                             width: '100%',
//                             padding: '0.75rem',
//                             fontSize: '16px',
//                             border: '1px solid var(--ifm-color-emphasis-300)',
//                             borderRadius: '8px',
//                             backgroundColor: 'var(--ifm-background-color)',
//                             color: 'var(--ifm-font-color-base)',
//                             marginBottom: '1rem',
//                         }}
//                     />
//                     <button
//                         type="submit"
//                         style={{
//                             width: '100%',
//                             padding: '0.75rem',
//                             backgroundColor: 'var(--ifm-color-primary)',
//                             color: '#fff',
//                             border: 'none',
//                             fontSize: '16px',
//                             borderRadius: '8px',
//                             cursor: 'pointer',
//                             transition: '0.2s',
//                         }}
//                     >
//                         Submit
//                     </button>
//                 </form>
//             </div>
//         );
//     }

//     return <>{children}</>;
// };

// export default PasswordProtect;


import React, { useState } from 'react';
import sha256 from 'crypto-js/sha256';

const PasswordProtect = ({ children }) => {
    const [password, setPassword] = useState('');
    const [authenticated, setAuthenticated] = useState(false);
    const correctHash = 'c19b6d93710fb94884b82f11334a0ef60e846d163c09f02c2cd13e72170ed40c';

    const handleSubmit = (e) => {
        e.preventDefault();
        const userHash = sha256(password).toString();
        if (userHash === correctHash) {
            setAuthenticated(true);
        } else {
            alert('Wrong password! Please try again.');
        }
    };

    if (!authenticated) {
        return (
            <div style={styles.container}>
                <h2 style={styles.heading}>🔒 This page is protected</h2>
                <form onSubmit={handleSubmit}>
                    <input
                        type="password"
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={styles.input}
                    />
                    <button type="submit" style={styles.button}>
                        Submit
                    </button>
                </form>
            </div>
        );
    }

    return <>{children}</>;
};

const styles = {
    container: {
        marginTop: '100px',
        maxWidth: '400px',
        marginLeft: 'auto',
        marginRight: 'auto',
        padding: '2rem',
        borderRadius: '12px',
        backgroundColor: '#fff',
        boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)',
        border: '1px solid #ccc',
    },
    heading: {
        textAlign: 'center',
        marginBottom: '1.5rem',
        color: '#333',
    },
    input: {
        width: '100%',
        padding: '0.75rem',
        fontSize: '16px',
        border: '1px solid #ccc',
        borderRadius: '8px',
        marginBottom: '1rem',
    },
    button: {
        width: '100%',
        padding: '0.75rem',
        backgroundColor: '#007bff',
        color: '#fff',
        border: 'none',
        fontSize: '16px',
        borderRadius: '8px',
        cursor: 'pointer',
    },
};

export default PasswordProtect;
