// 用户和AI的头像
const userAvatar = 'https://img.icons8.com/color/48/user-male-circle--v1.png';
const aiAvatar = 'AI/10.png';

// 添加消息到聊天框（完整支持文本/图片/链接/思维导图）
function addMessage(content, isUser = false) {
    const chatBox = document.getElementById('chat-box');
    const msg = document.createElement('div');
    msg.className = 'message ' + (isUser ? 'user-message' : 'ai-message');

    // 添加头像
    const avatar = document.createElement('img');
    avatar.src = isUser ? userAvatar : aiAvatar;
    avatar.className = 'message-avatar';
    msg.appendChild(avatar);

    // 内容容器
    const contentContainer = document.createElement('div');
    contentContainer.className = 'message-content';

    // ============= 处理AI返回内容 =============
    if (!isUser) {
        // 1. 检查是否是思维导图数据
        if (typeof content === 'object' && content.type === 'mindmap') {
            renderMindMap(content.data, contentContainer);
        }
        // 2. 处理富文本内容（包含图片/链接）
        else {
            contentContainer.innerHTML = `<strong>AI：</strong> ${processRichContent(content)}`;
            // 为图片添加点击事件
            setTimeout(() => {
                addImageZoomHandlers(contentContainer);
            }, 100);
        }
    }
    // 用户消息（纯文本）
    else {
        contentContainer.innerHTML = `<strong>您：</strong> ${escapeHtml(content)}`;
    }

    msg.appendChild(contentContainer);
    chatBox.appendChild(msg);
    chatBox.scrollTop = chatBox.scrollHeight;
}

// ============= 富文本处理核心函数 =============
function processRichContent(text) {
    if (!text) return '';

    // 1. 转义HTML防止XSS
    let safeText = escapeHtml(text);

    // 2. 处理图片（支持Markdown和普通URL）
    safeText = safeText
        // Markdown图片 ![alt](url)
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<div class="image-container"><img src="$2" alt="$1" class="chat-image"></div>')
        // 普通图片URL
        .replace(/(https?:\/\/[^\s]+?\.(jpe?g|png|gif|webp|bmp|svg))(?![\w.]*["'])/gi,
                '<div class="image-container"><img src="$1" alt="AI生成图片" class="chat-image"></div>');

    // 3. 处理链接 [text](url)
    safeText = safeText.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
        '<a href="$2" target="_blank" class="chat-link">$1</a>');

    // 4. 处理换行符
    safeText = safeText.replace(/\n/g, '<br>');

    return safeText;
}

// ============= 图片缩放功能 =============
function addImageZoomHandlers(container) {
    const images = container.querySelectorAll('.chat-image');
    images.forEach(img => {
        img.addEventListener('click', function() {
            this.classList.toggle('zoomed');
            // 如果图片被放大，点击其他地方可以缩小
            if (this.classList.contains('zoomed')) {
                const clickOutsideHandler = (e) => {
                    if (!img.contains(e.target)) {
                        img.classList.remove('zoomed');
                        document.removeEventListener('click', clickOutsideHandler);
                    }
                };
                setTimeout(() => {
                    document.addEventListener('click', clickOutsideHandler);
                }, 10);
            }
        });
    });
}

// ============= 辅助函数 =============
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function renderMindMap(mindData, container) {
    container.innerHTML = '<div class="mindmap-title">思维导图：</div>';
    const mindMapContainer = document.createElement('div');
    mindMapContainer.className = 'jsmind-container';
    container.appendChild(mindMapContainer);

    new jsMind({
        container: mindMapContainer,
        theme: 'primary',
        editable: false
    }).show(mindData);
}

// 更新底部框架内容
function updateBottomFrame(line1, line2, isVideoEnded = false) {
    const bottomFrame = document.getElementById('bottom-frame');
    if(!bottomFrame) return;

    bottomFrame.innerHTML = `
        <div class="frame-content">
            <p style="${isVideoEnded ? 'color: blue; font-weight: bold;' : ''}">${line1 || ''}</p>
            <p style="${isVideoEnded ? 'color: blue; font-weight: bold;' : ''}">${line2 || ''}</p>
        </div>
    `;

    if(isVideoEnded) {
        bottomFrame.style.backgroundColor = "#d4f0ff"; //
        bottomFrame.style.transition = "background-color 0.5s ease";
    }
}

// 初始化时调用
updateBottomFrame(
    "《中国饮食文化——民族饮食文化的五大特性》",
    "右侧是AI可以随时与他聊天互动哦~"
);

updateBottomFrame(
 "视频学习已完成，请根据刚刚的视频内容进行总结（比如画一个思维导图）",
    "不会的地方可以返回视频观看或者点击“思维导图”并与AI进行交流",
    true
);

// 消息发送到后端
async function sendMessage() {
    const input = document.getElementById('message-input');
    let text = input.value.trim();
    let displayText = text; // 保存原始文本用于显示

    if (!text) return;

    // 根据当前模式自动添加前缀（只修改发送的文本，不修改显示的文本）
    if (currentMode === 'mindmap') {
        text = `请用思维导图的形式回答以下问题：${text}`;
    } else if (currentMode === 'more') {
        text = `请用纯文本对以下内容进行总结：${text}`;
    }
    // 文本模式不加处理

    addMessage(displayText, true); // 显示原始文本

    // 记录交互日志
    const timestamp = Date.now();
    const videoTime = document.getElementById('video-player')?.currentTime || 0;
    interactionData.playEvents.push({
        type: 'chat_send',
        timestamp: timestamp,
        videoTime: videoTime,
        content: text // 记录实际发送的内容
    });

    input.value = '';
    const sendButton = document.getElementById('send-button');
    sendButton.disabled = true;

    try {
        const res = await fetch('http://localhost:5000/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: text, // 发送带有前缀的文本
                session_id: sessionId,
                mode: currentMode
            })
        });
        const data = await res.json();

        if (data.status === 'success') {
            if (data.type === 'mindmap') {
                addMessage({ type: 'mindmap', data: data.data });
            } else {
                addMessage(data.reply);
            }
        } else {
            addMessage(`错误：${data.message}`);
        }
    } catch (err) {
        console.error(err);
        addMessage("请求失败，请检查后端服务是否运行");
    } finally {
        sendButton.disabled = false;
    }
}

// 初始化视频监听
function setupVideoListener() {
    const videoPlayer = document.getElementById('video-player');
    if(!videoPlayer) return;

    videoPlayer.addEventListener('ended', function() {

updateBottomFrame(
 "视频学习已完成，请根据刚刚的视频内容进行总结（比如画一个思维导图）",
    "不会的地方可以返回视频观看或者点击“思维导图”并与AI进行交流",
    true
);

        // 记录交互日志
        const timestamp = Date.now();
        interactionData.playEvents.push({
            type: 'video_ended',
            timestamp: timestamp,
            videoTime: videoPlayer.currentTime
        });
    });
}

// 事件监听
document.getElementById('send-button').addEventListener('click', sendMessage);
document.getElementById('message-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') sendMessage();
});

// 初始化欢迎消息
window.addEventListener('DOMContentLoaded', () => {
    // 页面加载时生成新的会话ID
    sessionId = 'session_' + Math.random().toString(36).substr(2, 9);
    addMessage("Hi~，有问题随时交流", false);

    // 初始化底部框架默认内容
   updateBottomFrame(
    "《中国饮食文化——民族饮食文化的五大特性》",
    "右侧是AI可以随时与他聊天互动哦~"
);

    // 设置视频监听
    setupVideoListener();

    // 模式按钮高亮
    document.querySelectorAll('.mode-button').forEach(btn => {
        btn.addEventListener('click', () => {
            currentMode = btn.dataset.mode;
            document.querySelectorAll('.mode-button').forEach(b => b.style.backgroundColor = '');
            btn.style.backgroundColor = '#d0eaff';
        });
    });
});