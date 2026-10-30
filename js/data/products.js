/**
 * products.js  –  Dữ liệu sản phẩm
 *
 * Dữ liệu tạm thời cho giao diện; danh sách chính thức được tải từ API.
 */

const PRODUCTS = [
  {
    id: 1,
    name: 'Túi tote Kem',
    category: 'túi',
    color: 'kem',
    price: 450000,
    quantity: 0,
    image: 'assets/images/tui.jpg',
    desc: 'Túi tote móc bằng sợi cotton dày, form đứng, vừa laptop 13 inch.',
    features: [
      'Làm thủ công 100%',
      'Giao hàng 2–4 ngày',
      'Giặt tay nhẹ nhàng, phơi nơi thoáng mát',
    ],
    isNew: true,
  },
  {
    id: 2,
    name: 'Thỏ bông Hồng đất',
    category: 'thú bông',
    color: 'hồng',
    price: 280000,
    quantity: 0,
    image: 'assets/images/bong.jpg',
    desc: 'Thú bông len nhỏ xinh, làm quà tặng người thương.',
    features: [
      'Nguyên liệu sợi acrylic cao cấp',
      'Nhồi bông mềm mại',
      'Giao hàng 2–4 ngày',
    ],
    isNew: true,
  },
  {
    id: 3,
    name: 'Mũ bucket Xanh sage',
    category: 'mũ',
    color: 'xanh',
    price: 320000,
    quantity: 0,
    image: 'assets/images/non.jpg',
    desc: 'Mũ bucket len móc tay, màu xanh sage dịu dàng.',
    features: [
      'Làm thủ công 100%',
      'Size điều chỉnh được',
      'Giao hàng 2–4 ngày',
    ],
    isNew: true,
  },
  {
    id: 4,
    name: 'Khăn choàng Be',
    category: 'khăn',
    color: 'kem',
    price: 390000,
    quantity: 0,
    image: 'assets/images/non.jpg',
    desc: 'Khăn choàng móc tay màu be ấm áp, phong cách tối giản.',
    features: [
      'Sợi cotton mềm mịn',
      'Kích thước 30×180cm',
      'Giao hàng 3–5 ngày',
    ],
    isNew: false,
  },
  {
    id: 5,
    name: 'Gấu bông Nâu caramel',
    category: 'thú bông',
    color: 'nâu',
    price: 300000,
    quantity: 0,
    image: 'assets/images/non.jpg',
    desc: 'Gấu len nâu caramel ngọt ngào, thú cưng len nhỏ cho bé.',
    features: [
      'An toàn cho trẻ em',
      'Sợi len mềm chất lượng cao',
      'Giao hàng 2–4 ngày',
    ],
    isNew: false,
  },
  {
    id: 6,
    name: 'Túi mini Hồng phấn',
    category: 'túi',
    color: 'hồng',
    price: 260000,
    quantity: 0,
    image: 'assets/images/non.jpg',
    desc: 'Túi đeo chéo mini xinh xắn, vừa điện thoại và vài món nhỏ.',
    features: [
      'Làm thủ công 100%',
      'Dây đeo điều chỉnh được',
      'Giao hàng 2–4 ngày',
    ],
    isNew: false,
  },
];

/**
 * Lấy sản phẩm theo id
 * @param {number} id
 * @returns {object|undefined}
 */
function getProductById(id) {
  return PRODUCTS.find((p) => String(p.id) === String(id));
}

/**
 * Lấy danh sách sản phẩm liên quan (cùng category, khác id)
 * @param {number} currentId
 * @param {string} category
 * @param {number} limit
 * @returns {object[]}
 */
function getRelatedProducts(currentId, category, limit = 3) {
  const related = PRODUCTS.filter(
    (p) => String(p.id) !== String(currentId) && p.category === category
  );
  // Nếu không đủ, bổ sung sản phẩm khác
  if (related.length < limit) {
    const extra = PRODUCTS.filter(
      (p) => String(p.id) !== String(currentId) && !related.includes(p)
    );
    related.push(...extra.slice(0, limit - related.length));
  }
  return related.slice(0, limit);
}

/**
 * Format giá tiền VND
 * @param {number} price
 * @returns {string}
 */
function formatPrice(price) {
  return price.toLocaleString('vi-VN') + 'đ';
}

function mapApiProduct(product) {
  const category = product.category;
  return {
    id: String(product._id),
    name: product.name,
    category: typeof category === 'object' ? category.name : '',
    categoryId: String(typeof category === 'object' ? category._id : category),
    price: product.price,
    quantity: product.quantity,
    status: product.status,
    images: product.images,
    image: product.images[0],
    colors: product.colors,
    color: product.colors[0] || '',
    desc: product.description,
    features: [],
    createdAt: product.createdAt,
  };
}

let catalogLoaded = false;
let catalogLoadPromise;
const CATALOG_CACHE_KEY = 'kc_catalog_cache_v1';
const CATALOG_CACHE_TTL = 3 * 60 * 1000; // 3 phút cache nhanh giữa các trang

function loadProducts(forceRefresh = false) {
  if (!forceRefresh && catalogLoaded) return Promise.resolve(PRODUCTS);
  if (!forceRefresh && catalogLoadPromise) return catalogLoadPromise;

  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(CATALOG_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.timestamp < CATALOG_CACHE_TTL && Array.isArray(parsed.data) && parsed.data.length > 0) {
          PRODUCTS.splice(0, PRODUCTS.length, ...parsed.data.map(mapApiProduct));
          catalogLoaded = true;
          return Promise.resolve(PRODUCTS);
        }
      }
    } catch (_) {}
  }

  if (!window.KellyApi) throw new Error('API client is unavailable.');
  catalogLoadPromise = window.KellyApi.all('/api/products')
    .then((products) => {
      PRODUCTS.splice(0, PRODUCTS.length, ...products.map(mapApiProduct));
      catalogLoaded = true;
      try {
        sessionStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify({
          data: products,
          timestamp: Date.now(),
        }));
      } catch (_) {}
      return PRODUCTS;
    })
    .catch((error) => {
      catalogLoadPromise = undefined;
      throw error;
    });
  return catalogLoadPromise;
}

function clearCatalogCache() {
  catalogLoaded = false;
  catalogLoadPromise = undefined;
  try { sessionStorage.removeItem(CATALOG_CACHE_KEY); } catch (_) {}
}

window.ProductCatalog = {
  load: loadProducts,
  map: mapApiProduct,
  clearCache: clearCatalogCache,
  get loaded() { return catalogLoaded; },
};
