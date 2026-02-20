/**
 * Variation Engine V3 — adds natural handwriting irregularities.
 * V3 — Added 7 new handwriting fonts (12 total).
 */

// Seeded random for reproducibility per-document
function mulberry32(a) {
    return function () {
        a |= 0; a = a + 0x6D2B79F5 | 0;
        var t = Math.imul(a ^ a >>> 15, 1 | a);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

export function createVariationEngine(seed = 42, fatigueMode = 'none', pageProgress = 0) {
    const rand = mulberry32(seed);

    let charCount = 0;

    // Fatigue multiplier based on mode and progress through document
    const fatigueMult = () => {
        const charFatigue = 1.0 + Math.min(charCount / 6000, 0.4);
        switch (fatigueMode) {
            case 'gradual':
                // Steadily increases from 1.0 to 1.6 over all pages
                return charFatigue * (1.0 + pageProgress * 0.6);
            case 'rush':
                // Last 40% gets dramatically messier
                if (pageProgress > 0.6) {
                    const rushAmount = (pageProgress - 0.6) / 0.4; // 0→1 in last 40%
                    return charFatigue * (1.0 + rushAmount * 1.2);
                }
                return charFatigue;
            case 'careful-start':
                // First 20% is very neat, then loosens
                if (pageProgress < 0.2) {
                    return charFatigue * 0.4;
                }
                return charFatigue * (0.6 + (pageProgress - 0.2) * 0.75);
            default:
                return charFatigue;
        }
    };

    return {
        tick() { charCount++; },

        baselineJitter(intensity = 1.0) {
            return (rand() - 0.5) * 6.0 * intensity * fatigueMult();
        },

        letterSpacingJitter(intensity = 1.0) {
            return (rand() - 0.5) * 3.2 * intensity * fatigueMult();
        },

        rotationJitter(intensity = 1.0) {
            return (rand() - 0.5) * 0.06 * intensity * fatigueMult();
        },

        sizeJitter(baseFontSize, intensity = 1.0) {
            return baseFontSize + (rand() - 0.5) * 3.0 * intensity * fatigueMult();
        },

        opacityJitter(intensity = 1.0) {
            const fatigue = fatigueMult();
            // Fatigue makes ink less consistent
            const base = 0.65 + rand() * 0.35 * intensity;
            return Math.min(base / (fatigue * 0.3 + 0.7), 1.0);
        },

        wordSpacingJitter(intensity = 1.0) {
            return (rand() - 0.5) * 7.0 * intensity * fatigueMult();
        },

        lineStartJitter(intensity = 1.0) {
            return (rand() - 0.3) * 10 * intensity * fatigueMult();
        },

        baselineWave(charIndex, intensity = 1.0) {
            return Math.sin(charIndex * 0.08 + rand() * 2) * 3.5 * intensity * fatigueMult();
        },

        wordShift(intensity = 1.0) {
            return (rand() - 0.5) * 4.5 * intensity * fatigueMult();
        },

        wordStretch(intensity = 1.0) {
            return 0.94 + rand() * 0.12 * intensity;
        },

        inkBlob() {
            return rand() < 0.03 * fatigueMult();
        },

        lineAngle(intensity = 1.0) {
            return (rand() - 0.5) * 0.006 * intensity * fatigueMult();
        },

        random() {
            return rand();
        }
    };
}

export const HANDWRITING_STYLES = [
    {
        id: 'custom',
        name: 'My Handwriting',
        fontFamily: 'Caveat',
        fontSize: 52,
        letterSpacing: 1.0,
        lineHeight: 1.55,
        variationIntensity: 0.5,
        weight: '400',
        isCustom: true,
        description: 'Your own uploaded handwriting'
    },
    {
        id: 'neat',
        name: 'Neat Student',
        fontFamily: 'Caveat',
        fontSize: 52,
        letterSpacing: 1.0,
        lineHeight: 1.55,
        variationIntensity: 0.7,
        weight: '400',
        description: 'Clean, readable student handwriting'
    },
    {
        id: 'cursive',
        name: 'Cursive Style',
        fontFamily: 'Kalam',
        fontSize: 46,
        letterSpacing: 0.6,
        lineHeight: 1.5,
        variationIntensity: 0.9,
        weight: '400',
        description: 'Flowing cursive handwriting'
    },
    {
        id: 'casual',
        name: 'Casual Notes',
        fontFamily: 'Indie Flower',
        fontSize: 48,
        letterSpacing: 1.2,
        lineHeight: 1.65,
        variationIntensity: 0.8,
        weight: '400',
        description: 'Relaxed, informal style'
    },
    {
        id: 'classic',
        name: 'Classic Pen',
        fontFamily: 'Homemade Apple',
        fontSize: 38,
        letterSpacing: 1.0,
        lineHeight: 1.8,
        variationIntensity: 1.0,
        weight: '400',
        description: 'Traditional fountain pen look'
    },
    {
        id: 'quick',
        name: 'Quick Writing',
        fontFamily: 'Patrick Hand',
        fontSize: 50,
        letterSpacing: 0.8,
        lineHeight: 1.5,
        variationIntensity: 0.6,
        weight: '400',
        description: 'Fast, practical handwriting'
    },
    // ===== NEW STYLES =====
    {
        id: 'elegant',
        name: 'Elegant Script',
        fontFamily: 'Dancing Script',
        fontSize: 46,
        letterSpacing: 0.8,
        lineHeight: 1.55,
        variationIntensity: 0.65,
        weight: '400',
        description: 'Elegant, flowing cursive script'
    },
    {
        id: 'bold-sketch',
        name: 'Bold Sketch',
        fontFamily: 'Fredericka the Great',
        fontSize: 44,
        letterSpacing: 1.2,
        lineHeight: 1.7,
        variationIntensity: 0.5,
        weight: '400',
        description: 'Sketchy, bold pencil strokes'
    },
    {
        id: 'architect',
        name: 'Pencil Draft',
        fontFamily: 'Architects Daughter',
        fontSize: 48,
        letterSpacing: 1.0,
        lineHeight: 1.6,
        variationIntensity: 0.75,
        weight: '400',
        description: 'Architectural pencil writing'
    },
    {
        id: 'schoolbook',
        name: 'Schoolbook',
        fontFamily: 'Shadows Into Light Two',
        fontSize: 50,
        letterSpacing: 1.0,
        lineHeight: 1.55,
        variationIntensity: 0.8,
        weight: '400',
        description: 'Clean school notebook style'
    },
    {
        id: 'scratchy',
        name: 'Messy Scrawl',
        fontFamily: 'Rock Salt',
        fontSize: 36,
        letterSpacing: 1.4,
        lineHeight: 1.9,
        variationIntensity: 1.2,
        weight: '400',
        description: 'Rushed, scratchy handwriting'
    },
    {
        id: 'soft',
        name: 'Soft Cursive',
        fontFamily: 'Satisfy',
        fontSize: 48,
        letterSpacing: 0.8,
        lineHeight: 1.55,
        variationIntensity: 0.6,
        weight: '400',
        description: 'Soft, rounded cursive writing'
    },
    {
        id: 'marker',
        name: 'Marker Style',
        fontFamily: 'Permanent Marker',
        fontSize: 44,
        letterSpacing: 1.0,
        lineHeight: 1.6,
        variationIntensity: 0.55,
        weight: '400',
        description: 'Thick marker pen writing'
    },
    {
        id: 'vintage',
        name: 'Vintage Quill',
        fontFamily: 'Herr Von Muellerhoff',
        fontSize: 58,
        letterSpacing: 1.2,
        lineHeight: 1.45,
        variationIntensity: 0.7,
        weight: '400',
        description: 'Antique quill pen calligraphy'
    },
    {
        id: 'tech',
        name: 'Tech Print',
        fontFamily: 'Nanum Pen Script',
        fontSize: 50,
        letterSpacing: 0.9,
        lineHeight: 1.6,
        variationIntensity: 0.4,
        weight: '400',
        description: 'Neat technical lettering'
    }
];

export const INK_COLORS = {
    blue: {
        base: { r: 10, g: 30, b: 140 }, // Darker base blue
        variations: [
            { r: 8, g: 25, b: 130 },
            { r: 15, g: 35, b: 150 },
            { r: 10, g: 28, b: 135 },
            { r: 12, g: 32, b: 145 },
        ],
        label: 'Blue Ink'
    },
    darkblue: {
        base: { r: 5, g: 10, b: 60 }, // Deep Navy
        variations: [
            { r: 2, g: 8, b: 50 },
            { r: 8, g: 15, b: 70 },
            { r: 5, g: 12, b: 55 },
            { r: 6, g: 14, b: 65 },
        ],
        label: 'Dark Blue'
    },
    black: {
        base: { r: 15, g: 15, b: 18 }, // Pure Black-ish
        variations: [
            { r: 10, g: 10, b: 12 },
            { r: 20, g: 20, b: 24 },
            { r: 12, g: 12, b: 15 },
            { r: 18, g: 18, b: 20 },
        ],
        label: 'Black Ink'
    },
};

export const PAGE_TYPES = [
    {
        id: 'single-margin',
        name: 'Single Margin Ruled',
        marginLeft: 120,
        hasRuledLines: true,
        marginLineColor: '#d94040',
        ruledLineColor: '#a8c8e8',
        paperColor: '#FFFEF5',
        description: 'Standard notebook page'
    },
    {
        id: 'double-margin',
        name: 'Double Margin',
        marginLeft: 120,
        marginRight: 90,
        hasRuledLines: true,
        marginLineColor: '#d94040',
        ruledLineColor: '#a8c8e8',
        paperColor: '#FFFEF5',
        description: 'Assignment sheet with both margins'
    },
    {
        id: 'plain',
        name: 'Plain A4',
        marginLeft: 80,
        hasRuledLines: false,
        marginLineColor: 'transparent',
        ruledLineColor: 'transparent',
        paperColor: '#FFFFFF',
        description: 'Blank white paper'
    }
];

export const PAGE_TEMPLATES = [
    {
        id: 'none',
        name: 'None',
        description: 'No template — custom header'
    },
    {
        id: 'assignment',
        name: 'Assignment',
        pageTypeId: 'single-margin',
        headerDefaults: {
            title: 'Assignment',
            name: '',
            rollNumber: '',
            subject: '',
            date: new Date().toLocaleDateString('en-IN')
        },
        description: 'Standard college assignment format'
    },
    {
        id: 'lab-record',
        name: 'Lab Record',
        pageTypeId: 'double-margin',
        headerDefaults: {
            title: 'Laboratory Record',
            name: '',
            rollNumber: '',
            subject: '',
            date: new Date().toLocaleDateString('en-IN')
        },
        description: 'Lab practical record format'
    },
    {
        id: 'exam-answer',
        name: 'Exam Answer',
        pageTypeId: 'single-margin',
        headerDefaults: {
            title: '',
            name: '',
            rollNumber: '',
            subject: '',
            date: new Date().toLocaleDateString('en-IN')
        },
        description: 'Exam answer sheet format'
    }
];
