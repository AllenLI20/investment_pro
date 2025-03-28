import os
import re
import json
from openai import OpenAI


summary_tmpl = """\
分析以下24小时内的财经新闻，给出:

1. 当日消息面整体情况，包括利好和利空消息，以及对相关行业和板块的影响
2. 当日的政策面分析，有哪些重大的方向和板块需要关注，哪些行业/板块会受政策影响进行调整
3. 对第二天行情的预测，看涨哪些板块，看跌哪些板块，哪些龙头股值得关注，哪些风险需要重点关注

新闻内容:
{news_content}

最后按照json的格式返回：
```json
{{
    "news_impact": "...",  // 消息面整体情况
    "policy_impact": "...",  // 政策面分析
    "market_prediction": "..."  // 对第二天行情的预测
}}
```
"""


class DeepseekAI:
    def __init__(self, api_key=None, model="deepseek-r1"):
        # Default to environment variable if not provided
        api_key = api_key or os.environ.get("LKEAP_API_KEY")
        self.model = model
        self.client = OpenAI(
            api_key=api_key,
            base_url="https://api.lkeap.cloud.tencent.com/v1",
        )
    
    def generate(self, prompt, model=None):
        """
        Generate a response using the Deepseek model
        
        Args:
            prompt (str): The prompt to send to the model
            model (str, optional): Override the default model
            
        Returns:
            dict: Results containing reasoning and response content
        """
        use_model = model or self.model
        
        completion = self.client.chat.completions.create(
            model=use_model,
            messages=[
                {'role': 'user', 'content': prompt}
            ]
        )
        
        return {
            "reasoning": completion.choices[0].message.reasoning_content,
            "content": completion.choices[0].message.content
        }
    
    def analyze_news(self, news_content):
        """
        Analyze financial news using the Deepseek model
        
        Args:
            news_content (str): News content to analyze
            
        Returns:
            dict: Analysis results containing reasoning, content and parsed JSON
        """
        result = self.generate(summary_tmpl.format(news_content=news_content))
        
        # Parse JSON from the response
        parsed_json = self.parse_json_response(result["content"])
        
        return {
            "reasoning": result["reasoning"],
            "analysis": result["content"],
            "parsed_data": parsed_json
        }
    
    @staticmethod
    def parse_json_response(response_text):
        """
        Extract and parse JSON from a model response that may contain markdown code blocks
        
        Args:
            response_text (str): The model's response text
            
        Returns:
            dict: Parsed JSON object or None if parsing fails
        """
        # Try to extract JSON from markdown code blocks
        json_pattern = r"```(?:json)?\s*([\s\S]*?)\s*```"
        matches = re.findall(json_pattern, response_text)
        
        if matches:
            try:
                # Try to parse the first match
                return json.loads(matches[0])
            except json.JSONDecodeError:
                pass
        
        # If no code blocks or parsing failed, try to find any JSON-like structure
        try:
            # Look for content between curly braces including the braces
            brace_pattern = r"\{[\s\S]*\}"
            brace_matches = re.findall(brace_pattern, response_text)
            if brace_matches:
                return json.loads(brace_matches[0])
        except json.JSONDecodeError:
            pass
            
        # Return None if all parsing attempts fail
        return None
