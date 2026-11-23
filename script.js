const STORAGE_KEY = "inventoryProducts";
const LOW_STOCK_LIMIT = 10;
const CURRENCY = "$";

const sampleProducts = [
  { id: "P001", name: "Notebook A4", category: "Stationery", quantity: 48, price: 2.5 },
  { id: "P002", name: "Blue Pen (Box of 12)", category: "Stationery", quantity: 8, price: 4.2 },
  { id: "P003", name: "Orange Juice 250ml", category: "Beverages", quantity: 30, price: 1.1 },
  { id: "P004", name: "Cheese Sandwich", category: "Food", quantity: 0, price: 2.75 },
  { id: "P005", name: "Whiteboard Marker", category: "Stationery", quantity: 22, price: 1.4 }
];

let products = loadProducts();
let editingId = null;

const productList = document.getElementById("product-list");
const emptyMessage = document.getElementById("empty-message");
const searchInput = document.getElementById("search");
const categoryFilter = document.getElementById("category-filter");
const lowOnly = document.getElementById("low-only");
const dialog = document.getElementById("product-dialog");
const form = document.getElementById("product-form");
const formError = document.getElementById("form-error");
const idInput = document.getElementById("product-id");
const nameInput = document.getElementById("product-name");
const categoryInput = document.getElementById("product-category");
const quantityInput = document.getElementById("product-quantity");
const priceInput = document.getElementById("product-price");
const toast = document.getElementById("toast");

function loadProducts() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === null) {
    return sampleProducts;
  }
  try {
    return JSON.parse(saved);
  } catch (error) {
    return [];
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function openForm(product) {
  formError.hidden = true;
  form.reset();

  if (product) {
    editingId = product.id;
    document.getElementById("dialog-title").textContent = "Edit product";
    idInput.value = product.id;
    idInput.disabled = true;
    nameInput.value = product.name;
    categoryInput.value = product.category;
    quantityInput.value = product.quantity;
    priceInput.value = product.price;
  } else {
    editingId = null;
    document.getElementById("dialog-title").textContent = "Add product";
    idInput.disabled = false;
    idInput.value = suggestNextId();
  }

  dialog.showModal();
}

function suggestNextId() {
  let highest = 0;
  products.forEach(function (product) {
    const number = parseInt(product.id.replace(/\D/g, ""), 10);
    if (number > highest) {
      highest = number;
    }
  });
  return "P" + String(highest + 1).padStart(3, "0");
}

function validateForm() {
  const id = idInput.value.trim();
  const name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const quantity = quantityInput.value;
  const price = priceInput.value;

  if (!id || !name || !category || quantity === "" || price === "") {
    return "Please fill in all the fields.";
  }
  if (!Number.isInteger(Number(quantity)) || Number(quantity) < 0) {
    return "Quantity must be a whole number, 0 or more.";
  }
  if (Number(price) < 0) {
    return "Price cannot be negative.";
  }
  const duplicate = products.some(function (product) {
    return product.id.toLowerCase() === id.toLowerCase() && product.id !== editingId;
  });
  if (duplicate) {
    return "That Product ID is already in use.";
  }
  return "";
}

function saveProductFromForm(event) {
  event.preventDefault();

  const message = validateForm();
  if (message) {
    formError.textContent = message;
    formError.hidden = false;
    return;
  }

  const product = {
    id: idInput.value.trim(),
    name: nameInput.value.trim(),
    category: categoryInput.value.trim(),
    quantity: Number(quantityInput.value),
    price: Number(priceInput.value)
  };

  if (editingId) {
    const index = products.findIndex(function (item) {
      return item.id === editingId;
    });
    products[index] = product;
    showToast("Product updated");
  } else {
    products.push(product);
    showToast("Product added");
  }

  saveProducts();
  dialog.close();
  render();
}

function deleteProduct(id) {
  const product = products.find(function (item) {
    return item.id === id;
  });
  if (!confirm("Delete " + product.name + "?")) {
    return;
  }
  products = products.filter(function (item) {
    return item.id !== id;
  });
  saveProducts();
  render();
  showToast("Product deleted");
}

function changeQuantity(id, amount) {
  const product = products.find(function (item) {
    return item.id === id;
  });
  product.quantity = Math.max(0, product.quantity + amount);
  saveProducts();
  render();
}

function getStatus(product) {
  if (product.quantity === 0) {
    return "out";
  }
  if (product.quantity <= LOW_STOCK_LIMIT) {
    return "low";
  }
  return "ok";
}

function getFilteredProducts() {
  const term = searchInput.value.trim().toLowerCase();
  const category = categoryFilter.value;

  return products.filter(function (product) {
    const matchesSearch =
      product.name.toLowerCase().includes(term) ||
      product.id.toLowerCase().includes(term) ||
      product.category.toLowerCase().includes(term);
    const matchesCategory = category === "" || product.category === category;
    const matchesLow = !lowOnly.checked || getStatus(product) !== "ok";
    return matchesSearch && matchesCategory && matchesLow;
  });
}

function formatMoney(amount) {
  return CURRENCY + amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function renderTable(list) {
  const labels = { ok: "In stock", low: "Low stock", out: "Out of stock" };

  productList.innerHTML = list.map(function (product) {
    const status = getStatus(product);
    const id = escapeHtml(product.id);
    return `
      <tr class="${status === "ok" ? "" : status}">
        <td>${id}</td>
        <td>${escapeHtml(product.name)}</td>
        <td>${escapeHtml(product.category)}</td>
        <td class="num">
          <span class="qty">
            <button class="icon-btn" data-action="minus" data-id="${id}" aria-label="Decrease quantity">-</button>
            ${product.quantity}
            <button class="icon-btn" data-action="plus" data-id="${id}" aria-label="Increase quantity">+</button>
          </span>
        </td>
        <td class="num">${formatMoney(product.price)}</td>
        <td class="num">${formatMoney(product.quantity * product.price)}</td>
        <td><span class="badge badge-${status}">${labels[status]}</span></td>
        <td class="row-actions">
          <button class="link-btn" data-action="edit" data-id="${id}">Edit</button>
          <button class="link-btn danger" data-action="delete" data-id="${id}">Delete</button>
        </td>
      </tr>`;
  }).join("");

  if (list.length === 0) {
    emptyMessage.textContent = products.length === 0
      ? "No products yet. Click Add product to create your first one."
      : "No products match your search or filters.";
    emptyMessage.hidden = false;
  } else {
    emptyMessage.hidden = true;
  }
}

function renderStats() {
  let units = 0;
  let value = 0;
  let low = 0;

  products.forEach(function (product) {
    units += product.quantity;
    value += product.quantity * product.price;
    if (getStatus(product) !== "ok") {
      low++;
    }
  });

  document.getElementById("stat-products").textContent = products.length;
  document.getElementById("stat-units").textContent = units;
  document.getElementById("stat-value").textContent = formatMoney(value);
  document.getElementById("stat-low").textContent = low;
}

function renderCategories() {
  const selected = categoryFilter.value;
  const categories = [];

  products.forEach(function (product) {
    if (!categories.includes(product.category)) {
      categories.push(product.category);
    }
  });
  categories.sort();

  categoryFilter.innerHTML = '<option value="">All categories</option>' +
    categories.map(function (name) {
      return `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`;
    }).join("");
  categoryFilter.value = categories.includes(selected) ? selected : "";

  document.getElementById("category-list").innerHTML = categories.map(function (name) {
    return `<option value="${escapeHtml(name)}"></option>`;
  }).join("");
}

function render() {
  renderCategories();
  renderTable(getFilteredProducts());
  renderStats();
}

function csvCell(value) {
  return '"' + String(value).replace(/"/g, '""') + '"';
}

function exportCsv() {
  if (products.length === 0) {
    showToast("There are no products to export");
    return;
  }

  const rows = [["Product ID", "Product Name", "Category", "Quantity", "Price", "Total Value"]];
  products.forEach(function (product) {
    rows.push([
      product.id,
      product.name,
      product.category,
      product.quantity,
      product.price.toFixed(2),
      (product.quantity * product.price).toFixed(2)
    ]);
  });

  const csv = rows.map(function (row) {
    return row.map(csvCell).join(",");
  }).join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "inventory.csv";
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Inventory exported");
}

let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.hidden = true;
  }, 2200);
}

document.getElementById("add-btn").addEventListener("click", function () {
  openForm(null);
});
document.getElementById("cancel-btn").addEventListener("click", function () {
  dialog.close();
});
document.getElementById("export-btn").addEventListener("click", exportCsv);
form.addEventListener("submit", saveProductFromForm);
searchInput.addEventListener("input", render);
categoryFilter.addEventListener("change", render);
lowOnly.addEventListener("change", render);

productList.addEventListener("click", function (event) {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }
  const id = button.dataset.id;
  const action = button.dataset.action;

  if (action === "edit") {
    openForm(products.find(function (item) { return item.id === id; }));
  } else if (action === "delete") {
    deleteProduct(id);
  } else if (action === "plus") {
    changeQuantity(id, 1);
  } else if (action === "minus") {
    changeQuantity(id, -1);
  }
});

render();
