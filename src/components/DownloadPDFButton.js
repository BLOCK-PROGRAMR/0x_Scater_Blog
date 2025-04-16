import React, { useEffect, useState } from 'react';
import html2pdf from 'html2pdf.js';

const DownloadPDFButton = () => {
    const [contentLoaded, setContentLoaded] = useState(false);

    // Simulate fetching content
    useEffect(() => {
        // Simulate a delay (e.g., data fetching)
        setTimeout(() => {
            setContentLoaded(true);  // Mark content as loaded after 2 seconds
        }, 2000);
    }, []);

    const downloadPDF = () => {
        const content = document.querySelector('.theme-doc-markdown');

        if (!content) {
            alert('Could not find content to export.');
            return;
        }

        const options = {
            margin: [10, 10, 10, 10],
            filename: 'ethernaut-challenges.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, logging: true, useCORS: true, letterRendering: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        };

        html2pdf()
            .from(content)
            .set(options)
            .save()
            .then(() => console.log('PDF generated successfully!'))
            .catch((error) => console.error('Error generating PDF:', error));
    };

    return (
        <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
            <button
                onClick={downloadPDF}
                style={{
                    backgroundColor: '#4F46E5',
                    color: '#fff',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    transition: 'background-color 0.3s ease',
                }}
                onMouseOver={(e) => (e.target.style.backgroundColor = '#6366F1')}
                onMouseOut={(e) => (e.target.style.backgroundColor = '#4F46E5')}
                disabled={!contentLoaded} // Disable button if content is not yet loaded
            >
                📄 Download PDF
            </button>
            {!contentLoaded && <p>Loading content...</p>}
        </div>
    );
};

export default DownloadPDFButton;
