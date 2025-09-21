// === boot seguro após DOM
document.addEventListener("DOMContentLoaded", () => {
  // ====== Data no header
  (function () {
    const el = document.getElementById("today");
    if (!el) return;
    const d = new Date();
    const dias = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
    const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
    el.textContent = `${dias[d.getDay()]}, ${d.getDate()} de ${meses[d.getMonth()]}`;
  })();

  // ====== Tema
  const themeBtn = document.getElementById("themeBtn");
  const themeFx = document.getElementById("themeFx");
  function setTheme(m) {
    document.documentElement.setAttribute("data-theme", m === "light" ? "light" : "dark");
    if (themeBtn) themeBtn.textContent = m === "light" ? "☀️" : "🌙";
    if (themeFx) {
      themeFx.classList.add("on");
      setTimeout(() => themeFx.classList.remove("on"), 260);
    }
  }
  themeBtn?.addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    setTheme(cur === "dark" ? "light" : "dark");
  });
  setTheme("dark");

  // ====== Ripple leve nos botões (não bloqueia clique)
  (function attachRipples() {
    const selectors = ".btn-primary,.btn-ghost,.chip,.d-btn";
    document.addEventListener(
      "pointerdown",
      (e) => {
        const btn = e.target.closest(selectors);
        if (!btn) return;
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const span = document.createElement("span");
        span.className = "ripple";
        span.style.left = x + "px";
        span.style.top = y + "px";
        btn.appendChild(span);
        span.addEventListener("animationend", () => span.remove());
      },
      { passive: true }
    );
  })();

  // ====== Troca de abas (sem depender de classes CSS)
  const order = ["home", "classroom", "ia"];
  const tabs = order.map((k) => document.getElementById(`tab-${k}`)).filter(Boolean);
  let current = "home";
  let switching = false;

  // Garante visibilidade inicial estável
  tabs.forEach((t) => (t.style.display = "none"));
  const first = document.getElementById("tab-home");
  if (first) first.style.display = "block";

  function animateIn(el) {
    try {
      el.animate(
        [
          { opacity: 0, transform: "translateX(14px) scale(.985)", filter: "blur(2px)" },
          { opacity: 1, transform: "translateX(0) scale(1)", filter: "none" },
        ],
        { duration: 320, easing: "cubic-bezier(.18,.9,.2,1.24)" }
      );
    } catch (_) {}
  }
  function animateOut(el) {
    try {
      return el.animate(
        [
          { opacity: 1, transform: "translateX(0) scale(1)", filter: "none" },
          { opacity: 0, transform: "translateX(-10px) scale(.99)", filter: "blur(2px)" },
        ],
        { duration: 220, easing: "ease" }
      );
    } catch (_) {
      return { finished: Promise.resolve() };
    }
  }

  async function showTab(name) {
    if (!name || switching || name === current) return;
    const next = document.getElementById(`tab-${name}`);
    const prev = document.getElementById(`tab-${current}`);
    if (!next) return;

    switching = true;

    // Esconde todas (hard reset) e mostra só a próxima
    tabs.forEach((t) => (t.style.display = "none"));
    if (prev && prev !== next) {
      const anim = animateOut(prev);
      await anim.finished.catch(() => {});
      prev.style.display = "none";
    }

    next.style.display = "block";
    animateIn(next);

    // Dock state
    document.querySelectorAll(".d-btn").forEach((b) => {
      const is = b.dataset.tab === name;
      b.classList.toggle("active", is);
      b.setAttribute("aria-current", is ? "page" : "false");
    });

    // A11y + scroll
    next.setAttribute("tabindex", "-1");
    next.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "smooth" });

    current = name;
    setTimeout(() => (switching = false), 340);
  }

  // ====== Dock à prova de tudo
  const dockEl = document.querySelector(".dock");
  function activateFrom(target) {
    const btn = target?.closest?.(".d-btn");
    if (!btn) return false;
    const tab = btn.dataset.tab;
    if (tab) {
      showTab(tab);
      return true;
    }
    return false;
  }

  // Captura no documento (garante chegada do evento)
  const docHandler = (e) => {
    if (activateFrom(e.target)) e.preventDefault();
  };
  document.addEventListener("click", docHandler, { passive: false, capture: true });
  document.addEventListener("pointerup", docHandler, { passive: false, capture: true });
  document.addEventListener("touchend", docHandler, { passive: false, capture: true });

  // Captura na dock também (duplo seguro)
  const capHandler = (e) => {
    if (activateFrom(e.target)) e.preventDefault();
  };
  dockEl?.addEventListener("click", capHandler, { passive: false, capture: true });
  dockEl?.addEventListener("pointerup", capHandler, { passive: false, capture: true });
  dockEl?.addEventListener("touchend", capHandler, { passive: false, capture: true });

  // Fallback direto no botão (caso raro)
  document.querySelectorAll(".d-btn").forEach((btn) => {
    ["click", "pointerup", "touchend"].forEach((evt) => {
      btn.addEventListener(
        evt,
        (e) => {
          const tab = btn.dataset.tab;
          if (tab) {
            e.preventDefault();
            showTab(tab);
          }
        },
        { passive: false }
      );
    });
  });

  // ====== Swipe (mobile)
  let startX = null;
  document.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
    },
    { passive: true }
  );
  document.addEventListener(
    "touchend",
    (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      startX = null;
      if (Math.abs(dx) < 60) return;
      const idx = order.indexOf(current);
      if (idx < 0) return;
      const next = dx < 0 ? Math.min(order.length - 1, idx + 1) : Math.max(0, idx - 1);
      showTab(order[next]);
    },
    { passive: true }
  );

  // ====== Modais (login & novo chat) — com pop origin
  const loginBtn = document.getElementById("loginBtn");
  const loginModal = document.getElementById("loginModal");
  const chatModal = document.getElementById("chatModal");
  const newChatBtn = document.getElementById("newChatBtn");
  const createChatBtn = document.getElementById("createChat");

  loginBtn?.addEventListener("click", () => openModal(loginModal));
  loginModal?.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal(loginModal);
  });

  newChatBtn?.addEventListener("click", () => openModal(chatModal));
  chatModal?.addEventListener("click", (e) => {
    if (e.target.dataset.close !== undefined) closeModal(chatModal);
  });

  function openModal(m) {
    if (!m) return;
    placeOrigin(m);
    m.classList.remove("hidden");
    requestAnimationFrame(() => m.classList.add("show"));
  }
  function closeModal(m) {
    if (!m) return;
    m.classList.remove("show");
    setTimeout(() => m.classList.add("hidden"), 260);
  }
  function placeOrigin(m) {
    const el = document.activeElement;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((r.left + r.width / 2) / innerWidth) * 100;
    const y = ((r.top + r.height / 2) / innerHeight) * 100;
    m.style.setProperty("--origin-x", `${x}%`);
    m.style.setProperty("--origin-y", `${y}%`);
  }

  // ====== Toast
  const toast = document.getElementById("toast");
  function showToast(t) {
    if (!toast) return;
    toast.textContent = t;
    toast.classList.remove("hidden");
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => toast.classList.remove("show"), 1400);
  }

  // ====== Chat IA (visual)
  const chatList = document.getElementById("chatList");
  const chatTitle = document.getElementById("chatTitle");
  const chatStream = document.getElementById("chatStream");
  const chatInput = document.getElementById("chatInput");
  const sendBtn = document.getElementById("sendBtn");
  const renameBtn = document.getElementById("renameChat");
  const deleteBtn = document.getElementById("deleteChat");
  const chatNameInput = document.getElementById("chatNameInput");

  let chats = []; // {id,name,msgs:[]}
  let activeId = null;

  function renderChats() {
    if (!chatList) return;
    chatList.innerHTML = "";
    chats.forEach((c) => {
      const li = document.createElement("div");
      li.className = "list-item";
      li.innerHTML = `<span><b>${c.name}</b></span><small class="muted">${c.msgs.length} msgs</small>`;
      li.addEventListener("click", () => setActive(c.id));
      chatList.appendChild(li);
    });
  }
  function setActive(id) {
    activeId = id;
    const c = chats.find((x) => x.id === id);
    if (chatTitle) chatTitle.textContent = c ? c.name : "Chalkrise IA";
    renderStream();
  }
  function renderStream() {
    if (!chatStream) return;
    chatStream.innerHTML = "";
    const c = chats.find((x) => x.id === activeId);
    if (!c) {
      chatStream.innerHTML = `<div class="muted">Escolha um chat ou crie um novo</div>`;
      return;
    }
    c.msgs.forEach((m) => {
      const row = document.createElement("div");
      row.className = "msg " + (m.me ? "me" : "");
      row.innerHTML = `<div class="bubble">${m.text}</div>`;
      chatStream.appendChild(row);
    });
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  createChatBtn?.addEventListener("click", () => {
    const name = (chatNameInput?.value || `Chat ${chats.length + 1}`).trim();
    chats.unshift({ id: crypto.randomUUID(), name, msgs: [] });
    if (chatNameInput) chatNameInput.value = "";
    setActive(chats[0].id);
    closeModal(chatModal);
    renderChats();
    showToast("Chat criado");
  });

  renameBtn?.addEventListener("click", () => {
    const c = chats.find((x) => x.id === activeId);
    if (!c) return;
    openModal(chatModal);
    if (chatNameInput) chatNameInput.value = c.name;
    if (createChatBtn) {
      createChatBtn.onclick = () => {
        c.name = (chatNameInput?.value || c.name).trim();
        renderChats();
        setActive(c.id);
        closeModal(chatModal);
      };
    }
  });

  deleteBtn?.addEventListener("click", () => {
    if (!activeId) return;
    chats = chats.filter((x) => x.id !== activeId);
    activeId = chats[0]?.id ?? null;
    renderChats();
    renderStream();
    showToast("Chat excluído");
  });

  sendBtn?.addEventListener("click", send);
  chatInput?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      send();
    }
  });
  function send() {
    const c = chats.find((x) => x.id === activeId);
    if (!c || !chatInput) return;
    const v = chatInput.value.trim();
    if (!v) return;
    c.msgs.push({ me: true, text: v });
    chatInput.value = "";
    renderStream();
    setTimeout(() => {
      c.msgs.push({ me: false, text: "(visual) Beleza!" });
      renderStream();
    }, 500);
  }
});
