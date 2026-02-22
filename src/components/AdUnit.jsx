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
            // Ensure global array exists and push
            const ads = (window.adsbygoogle = window.adsbygoogle || []);
            // Only push if valid slot or auto-format
            if (slot && slot !== "SIDEBAR_SLOT_ID" && slot !== "TOP_BANNER_ID") {
                ads.push({});
            } else if (format === 'auto') {
                // For auto ads, we might not need to push individual slots if using the script tag in head for auto-ads
                // But for manual units, we do.
                // Safely ignore placeholder IDs to prevent AdSense errors
            }
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, [slot]);

    // Placeholder for development (since ads won't show on localhost usually)
    const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

    return (
        <div className="ad-container" style={{ margin: '16px 0', textAlign: 'center' }}>
            {label && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</div>}

            <div style={{ background: 'var(--bg-input)', borderRadius: '8px', overflow: 'hidden', minHeight: '90px' }}>
                {/* Only render AdSense unit if slot is a real ID (numbers) */}
                {slot && !isNaN(slot) ? (
                    <ins className="adsbygoogle"
                        style={style}
                        data-ad-client="ca-pub-6081792043858248"
                        data-ad-slot={slot}
                        data-ad-format={format}
                        data-full-width-responsive={responsive}
                        ref={adRef}>
                    </ins>
                ) : (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                        Ad Placeholder <br /> (Update Slot ID in App.jsx)
                    </div>
                )}

                {/* Dev Only Visual Placeholder */}
                {isDev && (
                    <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '12px', border: '1px dashed var(--border)', background: 'var(--accent-soft)' }}>
                        <b>AdSense Dev Placeholder</b><br />
                        Slot: {slot || 'Auto'} <br />
                        <small>Ads are hidden on localhost. Verify Publisher ID in public/ads.txt</small>
                    </div>
                )}
            </div>
        </div>
    );
}
