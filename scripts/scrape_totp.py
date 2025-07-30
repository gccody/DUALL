import json
import os
import requests

assets_path = "assets/custom-icons"

if not os.path.exists(assets_path):
    os.makedirs(assets_path)

data = requests.get("https://api.2fa.directory/v3/totp.json").json()

totps = []

for site in data:
  site_name = site[0]
  domain = site[1]['domain']
  try:
    img = site[1]['img']
  except:
    img = None
  extension = img.split(".")[-1] if img else "svg"
  if os.path.exists(f"{assets_path}/{site_name}.{extension}"):
    continue
  url = f"https://raw.githubusercontent.com/2factorauth/twofactorauth/master/img/{img[0] if img else domain[0]}/{img if img else domain+".svg"}"
  res = requests.get(url)
  if res.status_code >= 400:
    print(f"Failed to get {domain}: {url}")
    continue
  with open(f"{assets_path}/{domain}.{extension}", "wb") as f:
    f.write(res.content)
  totps.append({'name': site_name, 'domain': domain})
  print(f"Got {extension} for {domain}")

with open('assets/totp.json', 'w', encoding='utf-8') as f:
  json.dump(totps, f, indent=4)