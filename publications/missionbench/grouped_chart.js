(function(){
    const familyColors = {
        Gemini: '#4E79A7',
        Qwen: '#00A6D6',
        GPT: '#E15759',
        Claude: '#59A14F',
        Nova: '#B07AA1',
        InternVL: '#76B7B2',
        Gemma: '#F28E2B',
        Other: '#9C755F'
    };

    function hexToRgba(hexColor, alpha) {
        // Convert hex like "#4e79a7" to rgba(78, 121, 167, 0.4)
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    function getThemeColor(variableName, fallback) {
        const value = getComputedStyle(document.documentElement).getPropertyValue(variableName).trim();
        return value || fallback;
    }

    function desaturateColor(hexColor, lightness = 0.9) {
        // Parse hex and convert to a very light, desaturated version
        const hex = hexColor.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16);
        const g = parseInt(hex.substr(2, 2), 16);
        const b = parseInt(hex.substr(4, 2), 16);
        const gray = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        const light = Math.round(gray * (1 - lightness) + 255 * lightness);
        return `rgb(${light}, ${light}, ${light})`;
    }

    function familyOf(model) {
        if (!model || typeof model !== 'string') return 'Other';
        if (/Gemini/i.test(model)) return 'Gemini';
        if (/Qwen/i.test(model)) return 'Qwen';
        if (/GPT/i.test(model)) return 'GPT';
        if (/Gemma/i.test(model)) return 'Gemini';
        if (/Claude/i.test(model)) return 'Claude';
        if (/Nova/i.test(model)) return 'Nova';
        if (/InternVL/i.test(model)) return 'InternVL';
        return model.split(' ')[0];
    }

    function shortModelName(model) {
        if (!model || typeof model !== 'string') return model;
        const family = familyOf(model);
        const short = model.replace(new RegExp(`^${family}\\s*`, 'i'), '').trim();
        return short.length > 0 ? short : model;
    }

    const familyLogoPaths = {
        'Gemini': '../images/MissionBench/model_logos/gemini.png',
        'Qwen': '../images/MissionBench/model_logos/qwen.png',
        'GPT': '../images/MissionBench/model_logos/gpt.png',
        'Gemma': '../images/MissionBench/model_logos/gemini.png',
        'Claude': '../images/MissionBench/model_logos/claude.png',
        'Nova': '../images/MissionBench/model_logos/aws.png',
        'InternVL': '../images/MissionBench/model_logos/internvl.png',
        'Other': '../images/MissionBench/model_logos/gemini.png'
    };

    const logoImageCache = new Map();

    function getLogoImage(src) {
        if (!src) return null;
        if (!logoImageCache.has(src)) {
            const image = new Image();
            image.src = src;
            logoImageCache.set(src, image);
        }
        return logoImageCache.get(src);
    }

    function isDarkTheme() {
        try {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
            const bg = getComputedStyle(document.documentElement).getPropertyValue('--pst-color-background').trim();
            if (bg) {
                if (bg[0] === '#') {
                    const hex = bg.replace('#', '');
                    const r = parseInt(hex.substr(0, 2), 16);
                    const g = parseInt(hex.substr(2, 2), 16);
                    const b = parseInt(hex.substr(4, 2), 16);
                    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
                    return lum < 0.5;
                } else if (bg.startsWith('rgb')) {
                    const nums = bg.match(/\d+/g).map(Number);
                    const lum = (0.2126 * nums[0] + 0.7152 * nums[1] + 0.0722 * nums[2]) / 255;
                    return lum < 0.5;
                }
            }
        } catch (e) {}
        return false;
    }

    function getLogoSrc(family) {
        const entry = familyLogoPaths[family] || familyLogoPaths.Other;
        if (!entry) return null;
        if (typeof entry === 'string') return entry;
        // entry may be an object with { light: '...', dark: '...'}
        if (typeof entry === 'object') {
            const dark = isDarkTheme();
            if (dark && entry.dark) return entry.dark;
            return entry.light || entry.dark || null;
        }
        return null;
    }

    async function init() {
        const canvas = document.getElementById('grouped_by_family');
        if (!canvas) return;

        let rows = [];
        try {
            const resp = await fetch('missionbench/leaderboard_sr5.json?cb=' + Date.now());
            rows = await resp.json();
        } catch (e) {
            console.error('Failed loading leaderboard_sr5.json', e);
            return;
        }
        if (!Array.isArray(rows) || rows.length === 0) return;

        const items = rows
            .map(r => ({ model: r.model, sr5: Number(r.success_rate ?? r.sr5), open: Boolean(r.open) }))
            .filter(r => r.model && Number.isFinite(r.sr5));

        const familyMap = new Map();
        for (const it of items) {
            const fam = familyOf(it.model);
            const entry = { model: it.model, sr5: it.sr5, family: fam, short: shortModelName(it.model), open: !!it.open };
            if (!familyMap.has(fam)) familyMap.set(fam, []);
            familyMap.get(fam).push(entry);
            familyMap.get(fam).sort((a, b) => b.sr5 - a.sr5);
        }

        const familyOrder = Array.from(familyMap.keys());
        const labels = [];
        const labelEntries = [];
        for (let i = 0; i < familyOrder.length; ++i) {
            const fam = familyOrder[i];
            for (const m of familyMap.get(fam)) {
                labels.push(m.short);
                labelEntries.push(m);
            }
        }

        const datasets = familyOrder.map((fam) => {
            const color = familyColors[fam] || familyColors.Other;
            
            // Create single dataset for all models in this family
            const dataArr = labelEntries.map(entry => {
                if (!entry || entry.family !== fam) return null;
                return entry.sr5 === 0 ? 0.3 : entry.sr5;
            });
            
            // For this family, determine if each bar is open or closed
            const backgroundColors = labelEntries.map(entry => {
                if (!entry || entry.family !== fam) return 'transparent';
                // Open models: semi-transparent color, closed models: solid fill
                return entry.open ? hexToRgba(color, 0.2) : color;
            });
            
            const borderColors = labelEntries.map(entry => {
                if (!entry || entry.family !== fam) return 'transparent';
                // Open models: show border, closed models: no border
                return entry.open ? color : 'transparent';
            });
            
            return {
                label: fam,
                data: dataArr,
                backgroundColor: backgroundColors,
                borderColor: borderColors,
                borderWidth: entry => labelEntries[entry.dataIndex]?.open ? 1 : 0
            };
        });

        const highestSr5 = Math.max(...items.map(item => item.sr5));
        const yAxisMax = Math.ceil(highestSr5 + 5);

        const familyGroups = familyOrder.map((fam, idx) => {
            const indices = [];
            labelEntries.forEach((entry, labelIndex) => {
                if (entry && entry.family === fam) indices.push(labelIndex);
            });
            if (indices.length === 0) return null;
            return {
                family: fam,
                firstIndex: indices[0],  // Already tallest (data sorted by SR5 desc)
                datasetIndex: idx
            };
        }).filter(Boolean);

        const familyLogoPlugin = {
            id: 'familyLogoOverlay',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                if (!chart.chartArea) return;

                const topPadding = 12; // padding above the bar top

                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';

                    familyGroups.forEach(group => {
                    const src = getLogoSrc(group.family);
                    const image = getLogoImage(src);
                    if (!image || !image.complete || !image.naturalWidth || !image.naturalHeight) return;

                    const meta = chart.getDatasetMeta(group.datasetIndex);
                    const bar = meta?.data?.[group.firstIndex];
                    if (!bar) return;

                    // Render every logo inside a fixed bounding box so they appear uniform.
                    // Use a 'contain' fit so each logo scales down to fit inside the box.
                    const boxW = 75; 
                    const boxH = 25;  

                    const nw = image.naturalWidth;
                    const nh = image.naturalHeight;
                    if (!nw || !nh) return;

                    // scale to fit inside the box (contain strategy)
                    const scaleContain = Math.min(boxW / nw, boxH / nh);
                    const logoW = Math.round(nw * scaleContain);
                    const logoH = Math.round(nh * scaleContain);

                    // align logo left edge with the first bar's left edge
                    let dx = Math.round(bar.x - (bar.width || 0) / 2);
                    let dy = Math.round(bar.y - logoH - topPadding);

                    // clamp horizontally to chart drawing area so first/last logos stay inside
                    const chartLeft = chart.chartArea?.left ?? 0;
                    const chartRight = chart.chartArea?.right ?? (chart.width || 0);
                    dx = Math.max(chartLeft + 2, Math.min(dx, chartRight - logoW - 2));

                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(dx, dy, logoW, logoH);
                    ctx.drawImage(image, dx, dy, logoW, logoH);
                });

                ctx.restore();
            }
        };

        const familyDividerPlugin = {
            id: 'familyDividers',
            afterDatasetsDraw(chart) {
                const { ctx } = chart;
                if (!chart.chartArea) return;

                ctx.save();
                ctx.strokeStyle = 'rgba(200, 200, 200, 0.5)';
                ctx.lineWidth = 1;

                // Find boundaries between families and draw vertical lines
                let lastFamily = null;
                for (let i = 0; i < labelEntries.length; ++i) {
                    const entry = labelEntries[i];
                    if (!entry) continue;
                    
                    if (lastFamily && entry.family !== lastFamily) {
                        // Family changed, draw divider
                        const meta = chart.getDatasetMeta(0);
                        const bar = meta?.data?.[i];
                        if (bar) {
                            const x = bar.x - (bar.width || 0) / 2 - 3;
                            ctx.beginPath();
                            ctx.moveTo(x, chart.chartArea.top);
                            ctx.lineTo(x, chart.chartArea.bottom);
                            ctx.stroke();
                        }
                    }
                    lastFamily = entry.family;
                }
                ctx.restore();
            }
        };

        const ctx = canvas.getContext('2d');
        if (canvas._chartInstance) try { canvas._chartInstance.destroy(); } catch(e){}

        const cfg = {
            type: 'bar',
            data: { labels: labels, datasets: datasets },
            plugins: [familyLogoPlugin, familyDividerPlugin],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: { display: false, text: '', font: { size: 20, weight: 'bold' }, padding: { top: 8, bottom: 20 } },
                    legend: { display: false },
                    tooltip: {
                        enabled: true,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            title: (context) => {
                                if (!context.length) return '';
                                const point = context[0];
                                const entry = labelEntries[point.dataIndex];
                                if (!entry) return point.label || '';
                                const srText = entry.sr5 === 0.3 ? '0%' : `${entry.sr5.toFixed(1)}%`;
                                return [entry.model, `SR5: ${srText}`];
                            },
                            label: (context) => {
                                if (context.value === null || context.value === undefined) return null;
                                const display = context.value === 0.3 ? '0%' : `${context.value.toFixed(1)}%`;
                                return `${context.dataset.label}: ${display}`;
                            },
                            filter: (item) => item.value !== null && item.value !== undefined
                        }
                    }
                },
                hover: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    x: {
                        stacked: true,
                        ticks: {
                            display: true,
                            color: getThemeColor('--pst-color-text-base', '#4a4a4a'),
                            font: { size: 10 },
                            callback: function(value, index) {
                                try {
                                    return (typeof labelEntries !== 'undefined' && labelEntries[index] && labelEntries[index].short) ? labelEntries[index].short : value;
                                } catch (e) {
                                    return value;
                                }
                            }
                        },
                        grid: { display: false }
                    },
                    y: { 
                        stacked: true,
                        beginAtZero: true, 
                        max: yAxisMax, 
                        title: { display: true, text: 'SR5 (%)', color: getThemeColor('--pst-color-text-base', '#4a4a4a'), font: { size: 11 } }, 
                        grid: {
                            color: getThemeColor('--pst-color-border', 'rgba(127, 127, 127, 0.18)'),
                            borderColor: getThemeColor('--pst-color-border', 'rgba(127, 127, 127, 0.18)')
                        },
                        ticks: {
                            color: getThemeColor('--pst-color-text-base', '#4a4a4a'),
                            font: { size: 10 }
                        }
                    }
                },
                datasets: { bar: { categoryPercentage: 1.0, barPercentage: 0.95 } },
                layout: { padding: { top: 80 } }
            }
        };

        canvas.style.height = '400px';
        canvas.style.maxWidth = '1600px';

        const uniqueLogoSources = Array.from(new Set(familyOrder.map(fam => getLogoSrc(fam)).filter(Boolean)));
        uniqueLogoSources.forEach(src => {
            const image = getLogoImage(src);
            if (image && !image._missionBenchRedrawHooked) {
                image._missionBenchRedrawHooked = true;
                image.onload = () => {
                    if (canvas._chartInstance) canvas._chartInstance.draw();
                };
            }
        });

        canvas._chartInstance = new Chart(ctx, cfg);
    }

    if (document.readyState !== 'loading') init(); else document.addEventListener('DOMContentLoaded', init);
})();
