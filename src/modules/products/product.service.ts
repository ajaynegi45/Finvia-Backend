import type { CreateProductInput, ListProductsQuery } from './product.schemas';
import { ProductRepository } from './product.repository';

const FAKE_PRODUCTS: CreateProductInput[] = [
  {
    name: 'MacBook Pro 14"',
    sku: 'MBP14-M3-001',
    description: 'Apple M3 Chip, 16GB RAM, 512GB SSD',
    availableQuantity: 50,
    unitPricePaise: 16990000,
  },
  {
    name: 'iPhone 15 Pro',
    sku: 'IP15P-128-BLK',
    description: 'Black Titanium, 128GB',
    availableQuantity: 100,
    unitPricePaise: 13490000,
  },
  {
    name: 'iPad Air',
    sku: 'IPA-M2-256-BLU',
    description: 'Apple M2 Chip, 256GB, Blue',
    availableQuantity: 75,
    unitPricePaise: 5990000,
  },
  {
    name: 'AirPods Pro (2nd Gen)',
    sku: 'APP2-USB-C',
    description: 'MagSafe Case (USB‑C)',
    availableQuantity: 200,
    unitPricePaise: 2490000,
  },
  {
    name: 'Magic Mouse',
    sku: 'MM-WHT-2023',
    description: 'Wireless, Rechargeable, White',
    availableQuantity: 150,
    unitPricePaise: 750000,
  },
];

export const ProductService = {
  listAvailableProducts(query: ListProductsQuery) {
    return ProductRepository.findAvailable(query);
  },

  createProduct(data: CreateProductInput) {
    return ProductRepository.create(data);
  },

  seedFakeProducts() {
    return ProductRepository.bulkCreate(FAKE_PRODUCTS);
  },
};
