import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from sparkai.llm.llm import ChatSparkLLM, ChunkPrintHandler
from sparkai.core.messages import ChatMessage
import logging
from datetime import datetime

app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# 星火大模型配置
SPARKAI_URL = 'wss://spark-api.xf-yun.com/v3.1/chat'
SPARKAI_APP_ID = '09a26d5e'
SPARKAI_API_SECRET = 'ZGJmYTBlOGJjZjhiMTAyMmEwYzZhYmJh'
SPARKAI_API_KEY = '71e6b03f151a22b2fa6e7305e23bcb9d'
SPARKAI_DOMAIN = 'generalv3'

spark = ChatSparkLLM(
    spark_api_url=SPARKAI_URL,
    spark_app_id=SPARKAI_APP_ID,
    spark_api_key=SPARKAI_API_KEY,
    spark_api_secret=SPARKAI_API_SECRET,
    spark_llm_domain=SPARKAI_DOMAIN,
    streaming=False,
)

# 日志目录
log_dir = 'chat_logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

def log_conversation(user_input, ai_reply):
    log_filename = os.path.join(log_dir, f"{datetime.now().strftime('%Y-%m-%d')}_chat_log.txt")
    log_entry = f"{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\nUser: {user_input}\nAI: {ai_reply}\n\n"
    with open(log_filename, 'a', encoding='utf-8') as log_file:
        log_file.write(log_entry)

def generate_mindmap_data(topic, subtopics):
    """生成符合jsMind格式的思维导图数据"""
    nodes = [
        {"id": "root", "topic": topic, "expanded": True}
    ]
    for i, subtopic in enumerate(subtopics, 1):
        nodes.append({
            "id": f"child{i}",
            "topic": subtopic,
            "parentid": "root"
        })
    return {
        "meta": {
            "name": "AI生成的思维导图",
            "author": "AI",
            "version": "1.0",
        },
        "format": "node_array",
        "data": nodes
    }

@app.route("/")
def home():
    return "星火大模型API服务已运行"

@app.route("/chat", methods=["POST"])
def chat():
    try:
        if not request.is_json:
            return jsonify({"error": "Request must be JSON"}), 415

        data = request.get_json()
        user_input = data.get("message", "").strip()

        if not user_input:
            return jsonify({"error": "No message provided"}), 400

        # 增强版系统提示词（要求AI在特定情况下返回思维导图）
        system_prompt = """
你是一位智能学习助手，遵循以下规则：
1.聊天中如果学习者发送的内容无法识别比如一些数字、字母、符号等奇怪内容，先引导学习者发送与学习视频的相关的内容比如“请聊些与视频内容相关的话题”

2. 当前课程概述：中国饮食文化的五大特性包括食物原料选取的广泛性，进食心理选择的丰富性，菜肴制作的灵活性，
区域风格的历史传承性以及各区域间文化的通用性。中国幅员辽阔，食物原料种类丰富，但人口众多，吃饭问题一直是摆在每个人面前的大事，
这造就了中华民族的生存能力和探索精神。中国人追求食品多样化，上层社会追求山珍海味，老百姓为了生存寻找能吃的东西。
中国菜着制作灵活，追求调和的美味。中国各地饮食文化存在差异，但文化交流几乎无时不在发生。中国饮食文化源远流长，传播到世界各地。
超过0字回答，可适当延伸，不超过150字
聊天中如果学习者发送的内容无法识别，引导学习者发送与学习视频的相关的内容
        """

        messages = [
            ChatMessage(role="system", content=system_prompt),
            ChatMessage(role="user", content=user_input)
        ]

        response = spark.generate([messages])
        if not response.generations:
            raise ValueError("No response generated")

        ai_reply = response.generations[0][0].message.content

        # 尝试解析AI返回的内容是否为JSON（思维导图）
        try:
            reply_data = json.loads(ai_reply)
            if isinstance(reply_data, dict) and reply_data.get("type") == "mindmap":
                return jsonify({
                    "status": "success",
                    "type": "mindmap",
                    "data": reply_data["data"]
                })
        except json.JSONDecodeError:
            pass  # 不是JSON则按普通文本处理

        # 普通文本回复
        log_conversation(user_input, ai_reply)
        return jsonify({
            "status": "success",
            "reply": ai_reply
        })

    except Exception as e:
        logging.error(f"Error: {str(e)}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)