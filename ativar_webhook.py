import requests


resp = requests.get("https://n8n.v4lisboatech.com.br/webhook/squads?email=martins.gabriel@v4company.com", headers= {"x-api-key": "4815162342"})
squads = [x["projetos"]["nome"] for x in resp.json()]

print(squads)