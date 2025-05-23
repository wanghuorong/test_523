let hasSavedLog = false;

function displayInteractionLog() {
    const logContainer = document.createElement('div');
    logContainer.className = 'interaction-log';

    // 播放统计
    const stats = `
        <div class="log-section">
            <h3>播放统计</h3>
            <p>总播放时长: ${formatTime(interactionData.videoStats.totalPlayTime)}</p>
            <p>暂停次数: ${interactionData.pauseEvents.length}</p>
            <p>跳转次数: ${interactionData.seekEvents.length}</p>
            <p>前进跳转: ${interactionData.seekEvents.filter(e => e.type === 'seek-forward').length}</p>
            <p>后退跳转: ${interactionData.seekEvents.filter(e => e.type === 'seek-backward').length}</p>
            <p>视频完成: ${interactionData.playEvents.filter(e => e.type === 'over').length}次</p>
        </div>
    `;

    // 事件日志
    const events = interactionData.playEvents
        .concat(interactionData.pauseEvents)
        .concat(interactionData.seekEvents)
        .sort((a, b) => a.timestamp - b.timestamp);

    let eventLog = '<div class="log-section"><h3>事件序列</h3><ul>';
    events.forEach(event => {
        let label = event.type.toUpperCase();
        if (event.type === 'seek-forward') label = 'SEEK ➡️';
        else if (event.type === 'seek-backward') label = 'SEEK ⬅️';
        else if (event.type === 'over') label = 'OVER ✅';
        eventLog += `<li>[${formatTime(event.videoTime)} @ ${new Date(event.timestamp).toLocaleString()}] ${label}</li>`;
    });
    eventLog += '</ul></div>';

    logContainer.innerHTML = stats + eventLog;
    document.body.appendChild(logContainer);
}

function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

function saveInteractionLogToFile() {
    if (hasSavedLog) return;
    hasSavedLog = true;

    let logContent = '交互日志\n\n';
    logContent += '播放统计\n';
    logContent += `总播放时长: ${formatTime(interactionData.videoStats.totalPlayTime)}\n`;
    logContent += `暂停次数: ${interactionData.pauseEvents.length}\n`;
    logContent += `跳转次数: ${interactionData.seekEvents.length}\n`;
    logContent += `前进跳转: ${interactionData.seekEvents.filter(e => e.type === 'seek-forward').length}\n`;
    logContent += `后退跳转: ${interactionData.seekEvents.filter(e => e.type === 'seek-backward').length}\n`;
    logContent += `视频完成: ${interactionData.playEvents.filter(e => e.type === 'over').length}次\n\n`;

    const events = interactionData.playEvents
        .concat(interactionData.pauseEvents)
        .concat(interactionData.seekEvents)
        .sort((a, b) => a.timestamp - b.timestamp);

    logContent += '事件序列\n';
    events.forEach(event => {
        let label = event.type.toUpperCase();
        if (event.type === 'seek-forward') label = 'SEEK ➡️';
        else if (event.type === 'seek-backward') label = 'SEEK ⬅️';
        else if (event.type === 'over') label = 'OVER ✅';

        logContent += `[${formatTime(event.videoTime)} @ ${new Date(event.timestamp).toLocaleString()}] ${label}\n`;
    });

    const blob = new Blob([logContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `interaction_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}