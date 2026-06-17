const availableUsers = [
  { id: 1, name: "王小明", account: "wang", department: "業務部" },
  { id: 2, name: "王主任", account: "wang2", department: "業務部" },
  { id: 3, name: "陳經理", account: "chen", department: "管理部" },
  { id: 4, name: "李主任", account: "lee", department: "採購部" },
  { id: 5, name: "張經理", account: "chang", department: "營運部" },
  { id: 6, name: "林專員", account: "lin", department: "財務部" },
  { id: 7, name: "黃課長", account: "huang", department: "資訊部" },
  { id: 8, name: "吳助理", account: "wu", department: "客服部" },
  { id: 9, name: "周副理", account: "chou", department: "倉儲部" }
];

const initialAuthorizedUsers = availableUsers.slice(0, 8);

class PermissionManager {
  constructor(root, users, authorizedUsers) {
    this.root = root;
    this.users = users;
    this.authorizedUsers = [...authorizedUsers];
    this.activeSuggestionIndex = -1;
    this.filteredSuggestions = [];
    this.modalFilter = "";

    this.elements = {
      tagList: root.querySelector("[data-role='tag-list']"),
      hiddenCount: root.querySelector("[data-role='hidden-count']"),
      authorizedCount: root.querySelector("[data-role='authorized-count']"),
      searchForm: root.querySelector("[data-role='search-form']"),
      searchInput: root.querySelector("[data-role='search-input']"),
      autocompleteList: root.querySelector("[data-role='autocomplete-list']"),
      overlay: document.querySelector("[data-role='overlay']"),
      modalSearch: document.querySelector("[data-role='modal-search']"),
      modalTable: document.querySelector("[data-role='modal-table']")
    };

    this.bindEvents();
    this.renderTags();
    this.renderAutocomplete();
    this.renderTable();
  }

  bindEvents() {
    this.elements.searchInput.addEventListener("input", () => {
      this.activeSuggestionIndex = -1;
      this.renderAutocomplete();
    });

    this.elements.searchInput.addEventListener("keydown", (event) => this.handleAutocompleteKeys(event));

    this.elements.searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.filteredSuggestions.length > 0) {
        const selectedUser = this.filteredSuggestions[Math.max(this.activeSuggestionIndex, 0)];
        this.addUser(selectedUser.id);
      }
    });

    this.elements.autocompleteList.addEventListener("mousedown", (event) => {
      const item = event.target.closest("[data-user-id]");
      if (!item) return;
      this.addUser(Number(item.dataset.userId));
    });

    this.elements.tagList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-id]");
      if (!button) return;
      this.removeUser(Number(button.dataset.removeId));
    });

    this.root.querySelector("[data-action='open-modal']").addEventListener("click", () => this.openModal());
    this.elements.overlay.querySelector("[data-action='close-modal']").addEventListener("click", () => this.closeModal());

    this.elements.overlay.addEventListener("click", (event) => {
      if (event.target === this.elements.overlay) this.closeModal();
    });

    this.elements.modalSearch.addEventListener("input", () => {
      this.modalFilter = this.elements.modalSearch.value.trim().toLowerCase();
      this.renderTable();
    });

    this.elements.modalTable.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-id]");
      if (!button) return;
      this.removeUser(Number(button.dataset.removeId));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeAutocomplete();
        this.closeModal();
      }
    });
  }

  renderTags() {
    const visibleUsers = this.authorizedUsers.slice(0, 5);
    const hiddenTotal = Math.max(this.authorizedUsers.length - visibleUsers.length, 0);

    this.elements.authorizedCount.textContent = this.authorizedUsers.length;
    this.elements.tagList.innerHTML = visibleUsers.map((user) => this.createTagTemplate(user)).join("");
    this.elements.hiddenCount.textContent = hiddenTotal > 0 ? `...還有 ${hiddenTotal} 位` : "";
  }

  renderAutocomplete() {
    const keyword = this.elements.searchInput.value.trim().toLowerCase();
    const authorizedIds = new Set(this.authorizedUsers.map((user) => user.id));

    this.filteredSuggestions = keyword
      ? this.users.filter((user) => {
        const searchable = `${user.name} ${user.account} ${user.department}`.toLowerCase();
        return !authorizedIds.has(user.id) && searchable.includes(keyword);
      })
      : [];

    this.elements.searchInput.setAttribute("aria-expanded", String(this.filteredSuggestions.length > 0));
    this.elements.autocompleteList.classList.toggle("is-open", this.filteredSuggestions.length > 0);
    this.elements.autocompleteList.innerHTML = this.filteredSuggestions
      .map((user, index) => this.createSuggestionTemplate(user, index))
      .join("");
  }

  renderTable() {
    const users = this.authorizedUsers.filter((user) => {
      if (!this.modalFilter) return true;
      const searchable = `${user.name} ${user.account} ${user.department}`.toLowerCase();
      return searchable.includes(this.modalFilter);
    });

    this.elements.modalTable.innerHTML = users.length
      ? users.map((user) => this.createTableRowTemplate(user)).join("")
      : "<tr><td class=\"permission-manager__empty\" colspan=\"4\">沒有符合條件的授權使用者</td></tr>";
  }

  addUser(userId) {
    if (this.authorizedUsers.some((user) => user.id === userId)) return;

    const user = this.users.find((item) => item.id === userId);
    if (!user) return;

    this.authorizedUsers.push(user);
    this.elements.searchInput.value = "";
    this.activeSuggestionIndex = -1;
    this.syncView();
    this.elements.searchInput.focus();
  }

  removeUser(userId) {
    this.authorizedUsers = this.authorizedUsers.filter((user) => user.id !== userId);
    this.syncView();
  }

  openModal() {
    this.elements.overlay.hidden = false;
    document.body.style.overflow = "hidden";
    this.renderTable();
    this.elements.modalSearch.focus();
  }

  closeModal() {
    if (this.elements.overlay.hidden) return;
    this.elements.overlay.hidden = true;
    document.body.style.overflow = "";
    this.elements.modalSearch.value = "";
    this.modalFilter = "";
    this.renderTable();
  }

  handleAutocompleteKeys(event) {
    if (!this.filteredSuggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.activeSuggestionIndex = (this.activeSuggestionIndex + 1) % this.filteredSuggestions.length;
      this.renderAutocomplete();
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      this.activeSuggestionIndex = (this.activeSuggestionIndex - 1 + this.filteredSuggestions.length) % this.filteredSuggestions.length;
      this.renderAutocomplete();
    }

    if (event.key === "Enter" && this.activeSuggestionIndex >= 0) {
      event.preventDefault();
      this.addUser(this.filteredSuggestions[this.activeSuggestionIndex].id);
    }
  }

  closeAutocomplete() {
    this.activeSuggestionIndex = -1;
    this.filteredSuggestions = [];
    this.elements.searchInput.setAttribute("aria-expanded", "false");
    this.elements.autocompleteList.classList.remove("is-open");
    this.elements.autocompleteList.innerHTML = "";
  }

  syncView() {
    this.renderTags();
    this.renderAutocomplete();
    this.renderTable();
  }

  createTagTemplate(user) {
    return `
      <span class="permission-manager__tag">
        <span class="permission-manager__tag-name">${user.name}</span>
        <button class="permission-manager__tag-remove" type="button" aria-label="移除 ${user.name}" data-remove-id="${user.id}">×</button>
      </span>
    `;
  }

  createSuggestionTemplate(user, index) {
    const activeClass = index === this.activeSuggestionIndex ? " is-active" : "";
    return `
      <li class="permission-manager__suggestion${activeClass}" role="option" data-user-id="${user.id}" aria-selected="${index === this.activeSuggestionIndex}">
        <span>
          <span class="permission-manager__suggestion-main">${user.name}</span>
          <span class="permission-manager__suggestion-meta">｜${user.department}</span>
        </span>
        <span class="permission-manager__suggestion-meta">${user.account}</span>
      </li>
    `;
  }

  createTableRowTemplate(user) {
    return `
      <tr>
        <td>${user.name}</td>
        <td>${user.account}</td>
        <td>${user.department}</td>
        <td>
          <button class="permission-manager__button permission-manager__button--danger" type="button" data-remove-id="${user.id}">
            移除
          </button>
        </td>
      </tr>
    `;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PermissionManager(
    document.querySelector("#permissionManager"),
    availableUsers,
    initialAuthorizedUsers
  );
});
