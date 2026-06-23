const availableUsers = [
  { id: "1", name: "王小明", account: "wang", department: "業務部" },
  { id: "2", name: "王主任", account: "wang2", department: "業務部" },
  { id: "3", name: "陳經理", account: "chen", department: "管理部" },
  { id: "4", name: "李主任", account: "lee", department: "採購部" },
  { id: "5", name: "張經理", account: "chang", department: "營運部" },
  { id: "6", name: "林專員", account: "lin", department: "財務部" },
  { id: "7", name: "黃課長", account: "huang", department: "資訊部" },
  { id: "8", name: "吳助理", account: "wu", department: "客服部" },
  { id: "9", name: "周副理", account: "chou", department: "倉儲部" }
];

const initialAuthorizedUsers = availableUsers.slice(0, 8);

class PermissionManager {
  constructor(root, users, authorizedUsers, options = {}) {
    this.root = root;
    this.users = users;
    this.authorizedUsers = [...authorizedUsers];
    this.options = {
      autocompleteLimit: 50,
      autocompleteViewportPadding: 12,
      autocompleteGap: 6,
      autocompleteMaxHeight: 240,
      showSuggestionsWhenEmpty: true,
      ...options
    };
    this.activeSuggestionIndex = -1;
    this.filteredSuggestions = [];
    this.modalFilter = "";
    this.selectedUserIds = new Set();
    this.isTagExpanded = false;

    this.elements = {
      tagList: root.querySelector("[data-role='tag-list']"),
      hiddenCount: root.querySelector("[data-role='hidden-count']"),
      authorizedCount: root.querySelector("[data-role='authorized-count']"),
      searchForm: root.querySelector("[data-role='search-form']"),
      searchInput: root.querySelector("[data-role='search-input']"),
      autocompleteList: root.querySelector("[data-role='autocomplete-list']"),
      overlay: document.querySelector("[data-role='overlay']"),
      modalSearch: document.querySelector("[data-role='modal-search']"),
      modalTable: document.querySelector("[data-role='modal-table']"),
      selectAll: document.querySelector("[data-role='select-all']"),
      selectionStatus: document.querySelector("[data-role='selection-status']"),
      removeSelectedButton: document.querySelector("[data-action='remove-selected']")
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

    this.elements.searchInput.addEventListener("focus", () => this.renderAutocomplete());
    this.elements.searchInput.addEventListener("click", () => this.renderAutocomplete());
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
      this.addUser(item.dataset.userId);
    });

    this.elements.tagList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-remove-id]");
      if (!button) return;
      this.removeUser(button.dataset.removeId);
    });

    this.root.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='toggle-tags']");
      if (!button) return;
      this.isTagExpanded = !this.isTagExpanded;
      this.renderTags();
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
      this.removeUser(button.dataset.removeId);
    });

    this.elements.modalTable.addEventListener("change", (event) => {
      const checkbox = event.target.closest("[data-select-id]");
      if (!checkbox) return;
      this.toggleUserSelection(checkbox.dataset.selectId, checkbox.checked);
    });

    this.elements.selectAll.addEventListener("change", () => {
      this.toggleVisibleUsersSelection(this.elements.selectAll.checked);
    });

    this.elements.removeSelectedButton.addEventListener("click", () => this.removeSelectedUsers());

    window.addEventListener("resize", () => this.updateAutocompletePosition());
    window.addEventListener("scroll", () => this.updateAutocompletePosition(), true);

    document.addEventListener("click", (event) => {
      if (this.root.contains(event.target)) return;
      this.closeAutocomplete();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeAutocomplete();
        this.closeModal();
      }
    });
  }

  renderTags() {
    const visibleUsers = this.isTagExpanded ? this.authorizedUsers : this.authorizedUsers.slice(0, 5);
    const hiddenTotal = Math.max(this.authorizedUsers.length - visibleUsers.length, 0);

    this.elements.authorizedCount.textContent = this.authorizedUsers.length;
    this.elements.tagList.classList.toggle("is-expanded", this.isTagExpanded);
    this.elements.tagList.innerHTML = visibleUsers.map((user) => this.createTagTemplate(user)).join("");
    this.elements.hiddenCount.innerHTML = this.createMoreTemplate(hiddenTotal);
  }

  renderAutocomplete() {
    const keyword = this.elements.searchInput.value.trim().toLowerCase();
    const authorizedIds = new Set(this.authorizedUsers.map((user) => this.normalizeUserId(user.id)));

    this.filteredSuggestions = this.users
      .filter((user) => {
        if (!keyword && !this.options.showSuggestionsWhenEmpty) return false;

        const searchable = `${user.name} ${user.account} ${user.department}`.toLowerCase();
        const isUnauthorized = !authorizedIds.has(this.normalizeUserId(user.id));
        const isMatched = keyword ? searchable.includes(keyword) : true;

        return isUnauthorized && isMatched;
      })
      .slice(0, this.options.autocompleteLimit);

    this.elements.searchInput.setAttribute("aria-expanded", String(this.filteredSuggestions.length > 0));
    this.elements.autocompleteList.classList.toggle("is-open", this.filteredSuggestions.length > 0);
    this.elements.autocompleteList.innerHTML = this.filteredSuggestions
      .map((user, index) => this.createSuggestionTemplate(user, index))
      .join("");

    this.updateAutocompletePosition();
  }

  renderTable() {
    const users = this.getVisibleModalUsers();

    this.elements.modalTable.innerHTML = users.length
      ? users.map((user) => this.createTableRowTemplate(user)).join("")
      : "<tr><td class=\"permission-manager__empty\" colspan=\"5\">沒有符合條件的授權使用者</td></tr>";

    this.updateBulkActionState(users);
  }

  addUser(userId) {
    const normalizedUserId = this.normalizeUserId(userId);

    if (this.authorizedUsers.some((user) => this.normalizeUserId(user.id) === normalizedUserId)) return;

    const user = this.users.find((item) => this.normalizeUserId(item.id) === normalizedUserId);
    if (!user) return;

    this.authorizedUsers.push(user);
    this.elements.searchInput.value = "";
    this.activeSuggestionIndex = -1;
    this.syncView();
    this.elements.searchInput.focus();
  }

  removeUser(userId) {
    const normalizedUserId = this.normalizeUserId(userId);

    this.authorizedUsers = this.authorizedUsers.filter((user) => this.normalizeUserId(user.id) !== normalizedUserId);
    this.selectedUserIds.delete(normalizedUserId);
    if (this.authorizedUsers.length <= 5) {
      this.isTagExpanded = false;
    }
    this.syncView();
  }

  toggleUserSelection(userId, shouldSelect) {
    const normalizedUserId = this.normalizeUserId(userId);

    if (shouldSelect) {
      this.selectedUserIds.add(normalizedUserId);
    } else {
      this.selectedUserIds.delete(normalizedUserId);
    }

    this.updateBulkActionState(this.getVisibleModalUsers());
  }

  toggleVisibleUsersSelection(shouldSelect) {
    this.getVisibleModalUsers().forEach((user) => {
      const normalizedUserId = this.normalizeUserId(user.id);

      if (shouldSelect) {
        this.selectedUserIds.add(normalizedUserId);
      } else {
        this.selectedUserIds.delete(normalizedUserId);
      }
    });

    this.renderTable();
  }

  removeSelectedUsers() {
    if (this.selectedUserIds.size === 0) return;

    this.authorizedUsers = this.authorizedUsers.filter((user) => !this.selectedUserIds.has(this.normalizeUserId(user.id)));
    this.selectedUserIds.clear();
    if (this.authorizedUsers.length <= 5) {
      this.isTagExpanded = false;
    }
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
    this.selectedUserIds.clear();
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
    this.elements.autocompleteList.classList.remove("is-above", "is-below");
    this.elements.autocompleteList.style.removeProperty("--autocomplete-max-height");
    this.elements.autocompleteList.innerHTML = "";
  }

  syncView() {
    this.renderTags();
    this.renderAutocomplete();
    this.renderTable();
  }

  getVisibleModalUsers() {
    return this.authorizedUsers.filter((user) => {
      if (!this.modalFilter) return true;
      const searchable = `${user.name} ${user.account} ${user.department}`.toLowerCase();
      return searchable.includes(this.modalFilter);
    });
  }

  updateBulkActionState(visibleUsers) {
    const visibleUserIds = visibleUsers.map((user) => this.normalizeUserId(user.id));
    const selectedVisibleTotal = visibleUserIds.filter((id) => this.selectedUserIds.has(id)).length;
    const selectedTotal = this.selectedUserIds.size;

    this.elements.selectAll.checked = visibleUsers.length > 0 && selectedVisibleTotal === visibleUsers.length;
    this.elements.selectAll.indeterminate = selectedVisibleTotal > 0 && selectedVisibleTotal < visibleUsers.length;
    this.elements.selectAll.disabled = visibleUsers.length === 0;
    this.elements.selectionStatus.textContent = `已選取 ${selectedTotal} 筆`;
    this.elements.removeSelectedButton.disabled = selectedTotal === 0;
  }

  updateAutocompletePosition() {
    if (!this.elements.autocompleteList.classList.contains("is-open")) return;

    const inputRect = this.elements.searchInput.getBoundingClientRect();
    const padding = this.options.autocompleteViewportPadding;
    const gap = this.options.autocompleteGap;
    const viewportHeight = window.innerHeight;
    const spaceBelow = Math.max(viewportHeight - inputRect.bottom - padding - gap, 0);
    const spaceAbove = Math.max(inputRect.top - padding - gap, 0);
    const shouldOpenAbove = spaceAbove > spaceBelow && spaceBelow < 180;
    const availableHeight = Math.min(
      shouldOpenAbove ? spaceAbove : spaceBelow,
      this.options.autocompleteMaxHeight
    );

    this.elements.autocompleteList.classList.toggle("is-above", shouldOpenAbove);
    this.elements.autocompleteList.classList.toggle("is-below", !shouldOpenAbove);
    this.elements.autocompleteList.style.setProperty("--autocomplete-max-height", `${Math.max(availableHeight, 0)}px`);
    this.elements.autocompleteList.style.setProperty("--autocomplete-gap", `${gap}px`);
  }

  createTagTemplate(user) {
    return `
      <span class="permission-manager__tag">
        <span class="permission-manager__tag-name">${user.name}</span>
        <button class="permission-manager__tag-remove" type="button" aria-label="移除 ${user.name}" data-remove-id="${user.id}">×</button>
      </span>
    `;
  }

  createMoreTemplate(hiddenTotal) {
    if (this.authorizedUsers.length <= 5) return "";

    const buttonText = this.isTagExpanded ? "收合" : "顯示更多";
    const hiddenText = hiddenTotal > 0 ? `...還有 ${hiddenTotal} 位` : "已顯示全部";

    return `
      <span>${hiddenText}</span>
      <button class="permission-manager__link-button" type="button" data-action="toggle-tags" aria-expanded="${this.isTagExpanded}">
        ${buttonText}
      </button>
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
    const isChecked = this.selectedUserIds.has(this.normalizeUserId(user.id)) ? " checked" : "";
    return `
      <tr>
        <td class="permission-manager__table-check">
          <label class="permission-manager__checkbox-label">
            <input class="permission-manager__checkbox" type="checkbox" data-select-id="${user.id}" aria-label="選取 ${user.name}"${isChecked}>
          </label>
        </td>
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

  normalizeUserId(userId) {
    return String(userId);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new PermissionManager(
    document.querySelector("#permissionManager"),
    availableUsers,
    initialAuthorizedUsers,
    {
      autocompleteLimit: 50,
      autocompleteMaxHeight: 240,
      autocompleteViewportPadding: 12,
      autocompleteGap: 6,
      showSuggestionsWhenEmpty: true
    }
  );
});
