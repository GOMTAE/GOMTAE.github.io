// docs/source/_static/custom.js
document.addEventListener('DOMContentLoaded', function() {
    let missionData = null;
    let leaderboardData = null;

    // Editable mapping for compact x-axis labels.
    // Update values here whenever you want different short names.
    const MODEL_SHORT_NAMES = {
        'Gemini 3.1 Pro': 'G3.1 Pro',
        'Gemini 2.5 Pro': 'G2.5 Pro',
        'Gemini 3 Flash': 'G3 Flash',
        'Gemini 2.5 Flash': 'G2.5 Flash',
        'Gemini 3.1 Flash Lite': 'G3.1 FL',
        'Gemini Robotics 1.5': 'GR 1.5',
        'Gemini Robotics 1.6': 'GR 1.6',
        'Gemma-4-31B-IT': 'Gemma-4-31B',
        'Claude Opus 4.6': 'Claude Opus 4.6',
        'Claude Sonnet 4.6': 'Claude Sonnet 4.6',
        'GPT-5.4': 'GPT-5.4',
        'GPT-5.4 Mini': 'GPT-5.4 Mini',
        'Nova Premier': 'Nova Premier',
        'Nova Pro': 'Nova Pro',
        'Qwen 3.5 9B': 'Qwen3.5-9B',
        'Qwen 3.5 27B': 'Qwen3.5-27B',
        'Qwen 3.5 35B-A3B': 'Qwen3.5-35B-A3B',
        'Qwen 3.6 35B-A3B-Q8': 'Qwen3.6-35B-Q8',
        'InternVL3.5 14B': 'InternVL3.5-14B'
    };

    // Load mission entries used by the interactive random fetcher.
    // Cache-bust mission JSON to reduce stale browser cache behavior.
    fetch(`missionbench/mission_webps.json?cb=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
            missionData = data;
        })
        .catch(error => console.error('Error loading mission data:', error));

    fetch(`missionbench/leaderboard_sr5.json?cb=${Date.now()}`)
        .then(response => response.json())
        .then(data => {
            leaderboardData = Array.isArray(data) ? data : [];
            renderSr5Leaderboard(leaderboardData);
        })
        .catch(error => console.error('Error loading SR5 leaderboard data:', error));

    function isAllowedImagePath(path) {
        if (typeof path !== 'string') {
            return false;
        }
        const imagePath = path.toLowerCase();
        return (
            (imagePath.endsWith('.png') || imagePath.endsWith('.jpg') || imagePath.endsWith('.jpeg')) &&
            !imagePath.endsWith('.webp')
        );
    }

    function imageLoads(url) {
        return new Promise(resolve => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = url;
        });
    }

    async function pickRandomRenderableMission(missions) {
        if (!Array.isArray(missions) || missions.length === 0) {
            return null;
        }

        // Shuffle candidates and pick the first renderable one.
        const candidates = [...missions].sort(() => Math.random() - 0.5);
        for (const mission of candidates) {
            if (!mission || !isAllowedImagePath(mission.image)) {
                continue;
            }
            const ok = await imageLoads(mission.image);
            if (ok) {
                return mission;
            }
        }
        return null;
    }

    // Expose function globally so the HTML buttons can call it
    window.fetchRandomMission = async function(missionType) {
        if (!missionData) {
            alert("Mission data is still loading. Please try again in a moment.");
            return;
        }

        if (!missionData[missionType] || missionData[missionType].length === 0) {
            alert("No missions available for category: " + missionType);
            return;
        }

        // Allow standard image files for random fetch but explicitly exclude webp.
        const missions = missionData[missionType].filter(item => isAllowedImagePath(item?.image));
        if (missions.length === 0) {
            alert("No non-webp image missions available for category: " + missionType);
            return;
        }

        const selectedMission = await pickRandomRenderableMission(missions);
        if (!selectedMission) {
            alert("No renderable mission image found for category: " + missionType);
            return;
        }

        // Update the HTML elements based on the exact missionType string
        const imgElement = document.getElementById(`image-${missionType}`);
        const textElement = document.getElementById(`text-${missionType}`);

        if (imgElement && textElement) {
            imgElement.src = selectedMission.image;
            imgElement.style.display = 'block';
            textElement.innerHTML = "<strong>Instruction:</strong> " + selectedMission.instruction;
        } else {
            console.error(`HTML elements for ${missionType} not found! Looked for image-${missionType} and text-${missionType}`);
        }
    };

    function getModelLogoText(modelName) {
        if (typeof modelName !== 'string' || modelName.length === 0) {
            return '?';
        }
        if (modelName.startsWith('Gemini')) return 'G';
        if (modelName.startsWith('Gemma')) return 'Ge';
        if (modelName.startsWith('Claude')) return 'C';
        if (modelName.startsWith('GPT')) return 'GPT';
        if (modelName.startsWith('Nova')) return 'N';
        if (modelName.startsWith('Qwen')) return 'Q';
        if (modelName.startsWith('InternVL')) return 'I';
        return modelName.slice(0, 2).toUpperCase();
    }

    function getModelLogoColor(modelName) {
        if (typeof modelName !== 'string') return '#4c6ef5';
        if (modelName.startsWith('Gemini') || modelName.startsWith('Gemma')) return '#1a73e8';
        if (modelName.startsWith('Claude')) return '#d9480f';
        if (modelName.startsWith('GPT')) return '#0f9d58';
        if (modelName.startsWith('Nova')) return '#7b2cbf';
        if (modelName.startsWith('Qwen')) return '#0b7285';
        if (modelName.startsWith('InternVL')) return '#495057';
        return '#4c6ef5';
    }

    function getModelShortName(modelName) {
        if (typeof modelName !== 'string' || modelName.length === 0) {
            return 'Unknown';
        }
        return MODEL_SHORT_NAMES[modelName] || modelName;
    }

    function buildLogoSvgDataUri(modelName) {
        const label = getModelLogoText(modelName);
        const color = getModelLogoColor(modelName);
        const svg = `
            <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                <circle cx="22" cy="22" r="21" fill="${color}" />
                <text x="22" y="26" text-anchor="middle" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="white">${label}</text>
            </svg>
        `;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function renderSr5Leaderboard(rows) {
        const chartRoot = document.getElementById('sr5-leaderboard-chart');
        if (!chartRoot || !Array.isArray(rows) || rows.length === 0) {
            return;
        }

        const normalized = rows
            .map(item => ({
                model: item.model,
                sr5: Number(item.success_rate ?? item.sr5),
                sn: Boolean(item.sn)
            }))
            .filter(item => item.model && Number.isFinite(item.sr5))
            .sort((a, b) => b.sr5 - a.sr5);

        if (normalized.length === 0) {
            return;
        }

        const yMax = Math.max(60, Math.ceil(Math.max(...normalized.map(d => d.sr5)) / 10) * 10);
        const ticks = [];
        for (let i = 0; i <= yMax; i += 10) {
            ticks.push(i);
        }

        const gridHtml = ticks
            .map(v => `<div class="sr5-grid-line" style="position:absolute;left:0;right:0;bottom:${(v / yMax) * 100}%;border-top:1px dashed #dee2e6;"></div>`)
            .join('');

        const yTickHtml = ticks
            .map(v => `
                <div style="position:absolute;right:10px;bottom:calc(${(v / yMax) * 100}% - 8px);font-size:12px;color:#6c757d;line-height:1;">${v}</div>
            `)
            .join('');

        const barsHtml = normalized
            .map((item, idx) => {
                const heightPercent = (item.sr5 / yMax) * 100;
                const shortName = getModelShortName(item.model);
                return `
                    <div class="sr5-bar-item" title="${item.model}: ${item.sr5}" style="flex:1 0 56px;min-width:56px;max-width:86px;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;">
                        <div class="sr5-bar-wrap" style="height:100%;width:100%;position:relative;display:flex;justify-content:center;align-items:flex-end;">
                            <div class="sr5-bar" style="width:100%;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#4c6ef5 0%,#364fc7 100%);min-height:2px;height:${heightPercent}%"></div>
                            <div style="position:absolute;left:50%;bottom:12px;transform:translateX(-50%) rotate(-90deg);transform-origin:center bottom;color:#000000;font-size:10px;font-weight:700;white-space:nowrap;pointer-events:none;">${shortName}</div>
                        </div>
                    </div>
                `;
            })
            .join('');

        chartRoot.innerHTML = `
            <div style="display:flex;align-items:stretch;min-width:1160px;">
                <div style="width:52px;height:420px;position:relative;border-right:1px solid #e9ecef;">
                    <div class="sr5-y-axis-label" style="position:absolute;left:2px;top:50%;transform:translateY(-50%) rotate(-90deg);font-weight:700;color:#343a40;">SR5</div>
                    ${yTickHtml}
                </div>
                <div class="sr5-plot-area" style="width:1100px;height:420px;position:relative;">
                    ${gridHtml}
                    <div class="sr5-bars" style="position:absolute;inset:0;display:flex;gap:14px;align-items:stretch;padding:0 8px;">${barsHtml}</div>
                </div>
            </div>
        `;

        chartRoot.style.position = 'relative';
        chartRoot.style.border = '1px solid #e9ecef';
        chartRoot.style.borderRadius = '10px';
        chartRoot.style.padding = '25px 20px 20px 52px';
        chartRoot.style.background = '#fff';
        chartRoot.style.overflowX = 'auto';
    }
});
