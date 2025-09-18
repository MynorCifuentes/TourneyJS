import os
import requests

OWNER = "MynorCifuentes"
REPO = "LFP_Proyecto1_201318644"
TOKEN = os.environ.get("GITHUB_TOKEN")
API_URL = f"https://api.github.com/repos/{OWNER}/{REPO}"

headers = {"Authorization": f"token {TOKEN}"}

def get_milestones():
    url = f"{API_URL}/milestones?state=all"
    resp = requests.get(url, headers=headers)
    return resp.json()

def get_issues(milestone_number):
    url = f"{API_URL}/issues?milestone={milestone_number}&state=all&per_page=100"
    resp = requests.get(url, headers=headers)
    return resp.json()

def format_date(date_str):
    if not date_str:
        return ""
    return date_str[:10]

def main():
    milestones = get_milestones()
    if not isinstance(milestones, list):
        print("La API no devolvió una lista de milestones:", milestones)
        return
    mermaid = [
        "```mermaid",
        "gantt",
        "    dateFormat  YYYY-MM-DD",
        f"    title Gantt de {REPO}",
        "    excludes    weekends"
    ]
    for m in milestones:
        section = f'    section {m["title"]}'
        mermaid.append(section)
        issues = get_issues(m["number"])
        for issue in issues:
            if "pull_request" in issue:
                continue
            start = format_date(issue.get("created_at"))
            end = format_date(m.get("due_on")) or start
            status = "done" if issue["state"] == "closed" else "active"
            mermaid.append(
                f'    {issue["title"]} :{status}, {issue["number"]}, {start}, {end}'
            )
    mermaid.append("```")
    os.makedirs("docs", exist_ok=True)
    with open("docs/gantt.md", "w", encoding="utf-8") as f:
        f.write("\n".join(mermaid))
        
if __name__ == "__main__":
    main()