/**
 * Loader for collatz-research's Swiss Cheese cube-scan exports
 * (see bridge_export.py in the collatz-research repo), so the box-universe
 * viewers can color cubes by Benford's-Law statistics instead of only
 * convergence/divergence/cycle behavior.
 */
(function (global) {
    const SUPPORTED_SCHEMA_VERSION = "1.0";

    const METRICS = {
        mad: { label: "MAD (Benford conformity)" },
        digital_mixing_speed: { label: "Digital Mixing Speed" },
        chi_squared_statistic: { label: "Chi-Squared Statistic" },
        dmix_variance: { label: "Dmix Variance" },
        ks_d_max: { label: "KS D-Max" },
    };

    function parseBridgeExport(jsonText) {
        const data = JSON.parse(jsonText);

        if (data.schema_version !== SUPPORTED_SCHEMA_VERSION) {
            throw new Error(
                `Unsupported bridge schema version "${data.schema_version}". ` +
                `Expected "${SUPPORTED_SCHEMA_VERSION}".`
            );
        }
        if (!Array.isArray(data.points)) {
            throw new Error('Bridge export is missing a "points" array.');
        }

        const byKey = new Map();
        for (const point of data.points) {
            byKey.set(`${point.a}-${point.b}-${point.c}`, point);
        }

        return { meta: data, byKey };
    }

    function lookupPoint(byKey, a, b, c) {
        return byKey.get(`${a}-${b}-${c}`) || null;
    }

    function getMetricRange(byKey, metric) {
        let min = Infinity;
        let max = -Infinity;
        for (const point of byKey.values()) {
            const value = point[metric];
            if (typeof value !== "number" || Number.isNaN(value)) continue;
            if (value < min) min = value;
            if (value > max) max = value;
        }
        if (min === Infinity) return null;
        return { min, max };
    }

    // Blue (low) -> Red (high) heatmap.
    function heatmapColor(value, range) {
        const THREE = global.THREE;
        if (!range || range.max === range.min) {
            return new THREE.Color(0x333333);
        }
        const t = Math.min(1, Math.max(0, (value - range.min) / (range.max - range.min)));
        const hue = (1 - t) * 0.66; // 0.66 = blue, 0.0 = red
        return new THREE.Color().setHSL(hue, 0.85, 0.5);
    }

    global.BridgeDataLoader = {
        SUPPORTED_SCHEMA_VERSION,
        METRICS,
        parseBridgeExport,
        lookupPoint,
        getMetricRange,
        heatmapColor,
    };
})(window);
