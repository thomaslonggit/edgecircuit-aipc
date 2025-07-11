import requests

url = "http://127.0.0.1:5000/check"
data = {
    "code": "module counter (\n  input clk;\n  output reg [3:0] out;\nendmodule\n"
}
response = requests.post(url, json=data)
print(response.json())
