import { useEffect, useRef } from 'react';

export default function AdUnit({
    slot,
    format = 'auto',
    responsive = 'true',
    style = { display: 'block' },
    label = 'Advertisement'
}) {
    const adRef = useRef(null);

    useEffect(() => {
        try {
            // Check if adsbygoogle is loaded and push the ad
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, []);

    // Placeholder for development (since ads won't show on localhost usually)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <div className="ad-container" style={{ margin: '16px 0', textAlign: 'center' }}>
            {label && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>}

            <div style={{ background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', minHeight: '90px' }}>
                <ins className="adsbygoogle"
                    style={style}
                    data-ad-client="ca-pub-6081792043858248"
                    data-ad-slot={slot}
                    data-ad-format={format}
                    data-full-width-responsive={responsive}
                    ref={adRef}>
                </ins>

                {/* Dev Only Visual Placeholder */}
                {isDev && (
                    <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)' }}>
                        Creates space for Ad {slot ? `(Slot: ${slot})` : '(Auto)'}
                        <br />
                        <small>Ads require valid Publisher ID & Domain approval</small>
                    </div>
                )}
            </div>
        </div>
    );
}
