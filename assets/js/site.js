(function () {
  const page = document.body.dataset.page;
  const base = document.body.dataset.base || "";

  const text = (value, fallback = "") => value || fallback;
  const asset = (path) => path ? base + path : "";

  async function fetchJson(path) {
    const response = await fetch(base + path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  async function fetchText(path) {
    const response = await fetch(base + path, { cache: "no-cache" });
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.text();
  }

  function normalizeApps(data) {
    return Array.isArray(data) ? data : data.apps || [];
  }

  function externalLinkIcon() {
    return '<svg class="external-link-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M17 7H9M17 7V15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function inlineMarkdown(value) {
    let html = escapeHtml(value);
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return html;
  }

  function parseFrontmatter(markdown) {
    if (!markdown.startsWith("---")) return { data: {}, body: markdown };
    const end = markdown.indexOf("\n---", 3);
    if (end === -1) return { data: {}, body: markdown };
    const raw = markdown.slice(3, end).trim();
    const data = {};
    raw.split(/\r?\n/).forEach((line) => {
      const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
      if (match) data[match[1]] = match[2].replace(/^["']|["']$/g, "");
    });
    return { data, body: markdown.slice(end + 4).trim() };
  }

  function renderMarkdown(markdown) {
    const lines = markdown.replace(/\r\n/g, "\n").split("\n");
    const html = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i += 1;
        continue;
      }

      if (line.startsWith("```")) {
        const lang = line.slice(3).trim();
        const code = [];
        i += 1;
        while (i < lines.length && !lines[i].startsWith("```")) {
          code.push(lines[i]);
          i += 1;
        }
        i += 1;
        html.push(`<pre><code class="language-${escapeHtml(lang)}">${escapeHtml(code.join("\n"))}</code></pre>`);
        continue;
      }

      const heading = line.match(/^(#{1,4})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
        i += 1;
        continue;
      }

      if (line.includes("|") && i + 1 < lines.length && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[i + 1])) {
        const headers = splitTableRow(line);
        i += 2;
        const rows = [];
        while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
          rows.push(splitTableRow(lines[i]));
          i += 1;
        }
        html.push(renderTable(headers, rows));
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
          i += 1;
        }
        html.push(`<ul>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const items = [];
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
          i += 1;
        }
        html.push(`<ol>${items.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ol>`);
        continue;
      }

      const paragraph = [line.trim()];
      i += 1;
      while (i < lines.length && lines[i].trim() && !/^(#{1,4})\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i]) && !lines[i].startsWith("```")) {
        paragraph.push(lines[i].trim());
        i += 1;
      }
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    }

    return html.join("");
  }

  function splitTableRow(line) {
    return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
  }

  function renderTable(headers, rows) {
    const head = headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("");
    const body = rows.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("");
    return `<div class="table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  }

  function appCard(app) {
    const href = app.comingSoon ? "#" : detailUrl(app);
    const tags = (app.tags || []).slice(0, 2).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const icon = app.icon
      ? `<img src="${asset(app.icon)}" alt="" loading="lazy">`
      : `<span class="app-icon-fallback ${escapeHtml(app.accent || "emerald")}" aria-hidden="true">${escapeHtml((app.name || "A").slice(0, 1))}</span>`;
    return `
      <a class="app-card ${app.comingSoon ? "is-disabled" : ""}" href="${href}">
        ${icon}
        <div>
          <div class="card-title-row">
            <h2>${escapeHtml(app.name)}</h2>
            <span class="status-pill">${escapeHtml(app.status || "App")}</span>
          </div>
          <p>${escapeHtml(displaySummary(app))}</p>
          <div class="mini-tags">${tags}</div>
        </div>
      </a>
    `;
  }

  function displaySummary(app) {
    return app.description || app.summary || "";
  }

  function platformText(app) {
    if (Array.isArray(app.platforms) && app.platforms.length) return app.platforms.join(", ");
    return app.platform || "";
  }

  function detailUrl(app) {
    return base + text(app.detailUrl || app.pageUrl, `apps/app/?slug=${encodeURIComponent(app.slug || app.id)}`);
  }

  function actionHref(app, key) {
    if (key === "download") return app.downloadUrl || app.releasesUrl || app.releaseNotesUrl || "";
    if (key === "github") return app.githubUrl || "";
    if (key === "release") return app.releaseNotesUrl || app.releasesUrl || "";
    if (key === "detail") return detailUrl(app);
    return "";
  }

  function appListCard(app) {
    const slug = app.slug || app.id;
    const accent = app.accent || "emerald";
    const isFeatured = app.featured || slug === "sounddeck";
    const tags = (app.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");
    const icon = app.icon
      ? `<img src="${asset(app.icon)}" alt="" loading="lazy">`
      : `<span class="app-icon-fallback ${escapeHtml(accent)}" aria-hidden="true">${escapeHtml((app.name || "A").slice(0, 1))}</span>`;
    const screenshot = app.screenshot
      ? `<img src="${asset(app.screenshot)}" alt="${escapeHtml(app.name)} screenshot" loading="lazy">`
      : `<div class="preview-placeholder ${escapeHtml(accent)}" aria-hidden="true"><span></span><span></span><span></span></div>`;
    const releaseHref = actionHref(app, "release");
    const downloadHref = actionHref(app, "download");
    const disabled = app.comingSoon ? ' aria-disabled="true" tabindex="-1"' : "";
    const downloadLabel = app.comingSoon ? "Coming soon" : "Download";

    return `
      <article class="app-list-card ${isFeatured ? "is-featured" : ""} accent-${escapeHtml(accent)}" data-tags="${escapeHtml((app.tags || []).join(" "))}" data-status="${escapeHtml(app.status || "")}">
        <div class="list-icon">${icon}</div>
        <div class="list-copy">
          <div class="list-title-row">
            <h2>${escapeHtml(app.name)}</h2>
            <span class="status-pill">${escapeHtml(app.status || "App")}</span>
          </div>
          <p>${escapeHtml(displaySummary(app))}</p>
          <div class="tag-list">${tags}</div>
          <dl class="list-meta">
            <div><dt>Version</dt><dd>${escapeHtml(app.version || "-")}</dd></div>
            <div><dt>Release</dt><dd>${escapeHtml(app.releaseDate || "-")}</dd></div>
            <div><dt>Platform</dt><dd>${escapeHtml(platformText(app) || "-")}</dd></div>
          </dl>
        </div>
        <figure class="list-preview">${screenshot}</figure>
        <div class="list-actions">
          <a class="list-button download ${app.comingSoon ? "is-disabled" : ""}" href="${escapeHtml(downloadHref || "#")}"${disabled}>${downloadLabel}</a>
          <a class="list-button outline ${app.githubUrl ? "" : "is-disabled"}" href="${escapeHtml(actionHref(app, "github") || "#")}" ${app.githubUrl ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true" tabindex="-1"'}>GitHub ${app.githubUrl ? externalLinkIcon() : ""}</a>
          <a class="list-button outline ${releaseHref ? "" : "is-disabled"}" href="${escapeHtml(releaseHref || "#")}" ${releaseHref ? 'target="_blank" rel="noopener noreferrer"' : 'aria-disabled="true" tabindex="-1"'}>Release Notes ${releaseHref ? externalLinkIcon() : ""}</a>
          <a class="learn-link ${app.comingSoon ? "is-disabled" : ""}" href="${escapeHtml(app.comingSoon ? "#" : actionHref(app, "detail"))}"${disabled}>Learn more <span aria-hidden="true">→</span></a>
        </div>
      </article>
    `;
  }

  function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  }

  function setHref(id, value) {
    const element = document.getElementById(id);
    if (element && value) element.href = value;
  }

  function setDownloadButton(app) {
    const element = document.getElementById("download-button");
    if (!element) return;
    element.href = app.downloadUrl || app.releasesUrl || "#";
    element.textContent = app.version ? `Download Latest (${app.version})` : "Download Latest";
    if (app.fileName) element.setAttribute("download", app.fileName);
  }

  function setImage(id, src, alt) {
    const element = document.getElementById(id);
    if (element && src) {
      element.src = asset(src);
      element.alt = alt || "";
    }
  }

  function renderDownloadFacts(app) {
    const facts = [
      ["Version", app.version],
      ["Platform", app.platform],
      ["File", app.fileName],
      ["File size", app.fileSize],
      ["Release date", app.releaseDate],
      ["License", app.license],
      ["SHA256", app.sha256]
    ];
    return facts
      .filter(([, value]) => value)
      .map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`)
      .join("");
  }

  async function initAppsList() {
    const apps = normalizeApps(await fetchJson("data/apps.json"));
    const container = document.getElementById("apps-list");
    const filters = document.getElementById("app-filters");

    function render(filter) {
      const filtered = filter === "All"
        ? apps
        : apps.filter((app) => {
            const tags = app.tags || [];
            return tags.includes(filter) || app.status === filter || app.category === filter;
          });
      container.innerHTML = filtered.length
        ? filtered.map(appListCard).join("")
        : `<p class="empty-note">該当するアプリはまだありません。</p>`;
    }

    if (filters) {
      filters.addEventListener("click", (event) => {
        const button = event.target.closest("[data-filter]");
        if (!button) return;
        filters.querySelectorAll(".filter-button").forEach((item) => item.classList.toggle("is-active", item === button));
        render(button.dataset.filter);
      });
    }

    render("All");
  }

  async function initAppDetail() {
    const slug = document.body.dataset.slug || new URLSearchParams(window.location.search).get("slug");
    if (!slug) throw new Error("Missing app slug");
    const [appData, markdown] = await Promise.all([
      fetchJson("data/apps.json"),
      fetchText(`content/apps/${slug}.md`)
    ]);
    const apps = normalizeApps(appData);
    const app = apps.find((item) => item.slug === slug || item.id === slug);
    if (!app) throw new Error(`App not found: ${slug}`);

    const parsed = parseFrontmatter(markdown);
    setText("app-title", parsed.data.title || app.name);
    setText("app-summary", parsed.data.summary || app.summary);
    setText("app-status", app.status || "App");
    setImage("app-icon", app.icon, "");
    setImage("app-screenshot", app.screenshot, `${app.name} screenshot`);
    setDownloadButton(app);
    setHref("github-button", app.githubUrl);
    setHref("release-link", app.releasesUrl || app.githubUrl);

    const tags = document.getElementById("app-tags");
    tags.innerHTML = (app.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("");

    document.getElementById("download-facts").innerHTML = renderDownloadFacts(app);
    document.getElementById("markdown-content").innerHTML = renderMarkdown(parsed.body);

    const related = apps.filter((item) => item.slug !== slug).slice(0, 3);
    document.getElementById("related-apps").innerHTML = related.length
      ? related.map(appCard).join("")
      : '<p class="empty-note">他のアプリはまだありません。data/apps.jsonに追加するとここに表示されます。</p>';
  }

  async function init() {
    try {
      if (page === "apps-list") await initAppsList();
      if (page === "app-detail") await initAppDetail();
    } catch (error) {
      console.error(error);
      const target = document.getElementById("markdown-content") || document.getElementById("apps-list");
      if (target) target.innerHTML = '<p class="load-error">コンテンツを読み込めませんでした。</p>';
    }
  }

  init();
})();
