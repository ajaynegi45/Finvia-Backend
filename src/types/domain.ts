export type InvoiceStatus = 'DRAFT' | 'FINALIZED' | 'PAID' | 'VOID';

export type ProductRecord = {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  availableQuantity: number;
  unitPricePaise: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductListItem = Pick<
    ProductRecord,
    'id' | 'name' | 'sku' | 'description' | 'availableQuantity' | 'unitPricePaise' | 'isActive'
>;

export type InvoiceItemInput = {
  productId: string;
  quantity: number;
};

export type InvoiceCreateInput = {
  customerName: string;
  notes?: string | null;
  items: InvoiceItemInput[];
};

export type InvoiceUpdateItemsInput = {
  items: InvoiceItemInput[];
};

export type InvoiceItemRecord = {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  unitPricePaise: number;
  quantity: number;
  lineTotalPaise: number;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string | null;
  status: InvoiceStatus;
  customerName: string;
  subtotalPaise: number;
  taxPaise: number;
  totalPaise: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

export type InvoiceDetail = InvoiceSummary & {
  notes: string | null;
  updatedBy: string | null;
  items: InvoiceItemRecord[];
};

export type PaginatedResult<T> = {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};
