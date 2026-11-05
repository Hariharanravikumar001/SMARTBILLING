import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Barcode,
  Plus,
  Minus,
  Trash2,
  Printer,
  CreditCard,
  QrCode,
  Banknote,
  Pause,
  Play,
  RotateCcw,
  CheckCircle2,
  User,
  Percent,
  X,
  Sparkles,
  Receipt
} from 'lucide-react';
import { CartItem, Product, Customer } from '../../types';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranding } from '../../context/BrandingContext';

export const ShopPOS: React.FC = () => {
  const { business, activeBranch, businessUser } = useAuth();
  const { branding } = useBranding();

  // Search & Catalog
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [categories, setCategories] = useState<any[]>([]);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerList, setCustomerList] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);

  // Financials & Payment
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'SPLIT' | 'CREDIT'>('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [splitDetails, setSplitDetails] = useState({ cash: 0, upi: 0 });

  // Held Bills
  const [heldBills, setHeldBills] = useState<any[]>([]);
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Success / Receipt Modal
  const [completedSale, setCompletedSale] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Load Initial Catalog & Categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchHeldBills();
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, [activeBranch]);

  const fetchProducts = async (q = '') => {
    try {
      const res: any = await api.get(`/pos/lookup?q=${encodeURIComponent(q)}`);
      if (res.success && res.data) {
        setProducts(res.data.products || res.data || []);
      }
    } catch (err) {
      console.error('[POS Lookup Error]:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const res: any = await api.get('/products/meta/categories');
      if (res.success) setCategories(res.data);
    } catch (err) {}
  };

  const fetchHeldBills = async () => {
    try {
      const res: any = await api.get('/pos/held');
      if (res.success) setHeldBills(res.data);
    } catch (err) {}
  };

  // Add Product to Cart
  const addToCart = (product: Product) => {
    setErrorMsg(null);
    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex((i) => i.productId === product.id && !i.variantId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const item = updated[existingIndex];
        const newQty = item.quantity + 1;
        const rawTotal = (newQty * item.unitPrice) - item.discountAmount;
        const taxAmt = (rawTotal * item.taxRate) / 100;
        updated[existingIndex] = {
          ...item,
          quantity: newQty,
          taxAmount: taxAmt,
          totalAmount: rawTotal + taxAmt
        };
        return updated;
      } else {
        const qty = 1;
        const unitPrice = product.selling_price;
        const taxRate = product.tax_rate || 0;
        const rawTotal = qty * unitPrice;
        const taxAmt = (rawTotal * taxRate) / 100;

        return [
          ...prevCart,
          {
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            barcode: product.barcode,
            unit: product.unit || 'PCS',
            quantity: qty,
            unitPrice,
            taxRate,
            taxAmount: taxAmt,
            discountAmount: 0,
            totalAmount: rawTotal + taxAmt,
            currentStock: product.current_stock
          }
        ];
      }
    });

    // Clear search and refocus
    setSearchQuery('');
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  };

  // Update Item Quantity
  const updateQuantity = (index: number, delta: number) => {
    setCart((prevCart) => {
      const updated = [...prevCart];
      const item = updated[index];
      const newQty = Math.max(1, item.quantity + delta);
      const rawTotal = (newQty * item.unitPrice) - item.discountAmount;
      const taxAmt = (rawTotal * item.taxRate) / 100;
      updated[index] = {
        ...item,
        quantity: newQty,
        taxAmount: taxAmt,
        totalAmount: rawTotal + taxAmt
      };
      return updated;
    });
  };

  // Remove Item
  const removeItem = (index: number) => {
    setCart((prevCart) => prevCart.filter((_, idx) => idx !== index));
  };

  // Calculate Totals
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  const taxTotal = cart.reduce((acc, item) => acc + item.taxAmount, 0);
  const totalBeforeRound = Math.max(0, subtotal + taxTotal - (parseFloat(String(discountAmount)) || 0));
  const grandTotal = Math.round(totalBeforeRound * 100) / 100;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  // Search Barcode Directly on Enter Key
  const handleBarcodeKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      const matched = products.find(p => p.barcode === searchQuery.trim() || p.sku.toLowerCase() === searchQuery.trim().toLowerCase());
      if (matched) {
        addToCart(matched);
      } else {
        fetchProducts(searchQuery.trim());
      }
    }
  };

  // Park / Hold Cart
  const handleHoldCart = async () => {
    if (cart.length === 0) return;
    try {
      const res: any = await api.post('/pos/hold', {
        items: cart,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        reference: `Cart (${cart.length} items)`
      });
      if (res.success) {
        setCart([]);
        setSelectedCustomer(null);
        fetchHeldBills();
      }
    } catch (err: any) {
      alert(err.message || 'Hold failed.');
    }
  };

  // Resume Parked Cart
  const handleResumeBill = async (held: any) => {
    setCart(held.items);
    if (held.customerName) {
      setSelectedCustomer({ name: held.customerName, phone: held.customerPhone } as any);
    }
    setShowHeldModal(false);
    // Delete from held table
    await api.delete(`/pos/held/${held.id}`);
    fetchHeldBills();
  };

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMsg('Cart is empty. Please add products.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);

    try {
      const payload = {
        items: cart.map(i => ({
          productId: i.productId,
          variantId: i.variantId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          taxRate: i.taxRate,
          discountAmount: i.discountAmount
        })),
        customerId: selectedCustomer?.id,
        customerName: selectedCustomer?.name,
        customerPhone: selectedCustomer?.phone,
        discountAmount: parseFloat(String(discountAmount)) || 0,
        paymentMethod,
        paymentDetails: paymentMethod === 'SPLIT' ? splitDetails : null,
        cashTendered: parseFloat(cashTendered) || grandTotal,
        notes: 'Walk-in Store POS Sale'
      };

      const res: any = await api.post('/pos/checkout', payload);
      if (res.success && res.data) {
        setCompletedSale({
          ...res.data,
          items: cart,
          business,
          branch: activeBranch,
          cashierName: businessUser?.name,
          paymentMethod,
          cashTendered: parseFloat(cashTendered) || grandTotal,
          changeDue
        });
        // Clear Cart
        setCart([]);
        setSelectedCustomer(null);
        setDiscountAmount(0);
        setCashTendered('');
      } else {
        setErrorMsg(res.message || 'Checkout failed.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Transaction failed.');
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredProducts = selectedCategory === 'ALL'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  return (
    <div className="h-[calc(100vh-5rem)] flex flex-col lg:flex-row gap-4">
      {/* Left Column: Product Search & Quick Grid */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm">
        {/* Top Search & Barcode Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Barcode className="w-5 h-5 text-blue-600 absolute left-3 top-2.5" />
              <input
                ref={barcodeInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchProducts(e.target.value);
                }}
                onKeyDown={handleBarcodeKeyDown}
                placeholder="Scan Barcode or Search Products (Name / SKU)... [Press Enter]"
                className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            {heldBills.length > 0 && (
              <button
                onClick={() => setShowHeldModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold shadow-sm"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Held Carts ({heldBills.length})</span>
              </button>
            )}
          </div>

          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                selectedCategory === 'ALL'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCategory(c.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === c.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Tiles Grid */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.map((p) => (
            <div
              key={p.id}
              onClick={() => addToCart(p)}
              className="p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">{p.sku}</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    Stock: {p.current_stock ?? 0}
                  </span>
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white line-clamp-2 leading-snug group-hover:text-blue-600">
                  {p.name}
                </h4>
              </div>

              <div className="mt-3 flex items-baseline justify-between pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                <span className="text-sm font-black text-slate-900 dark:text-white">
                  {branding.currencySymbol}{p.selling_price}
                </span>
                <span className="text-[10px] text-slate-400">+{p.tax_rate}% GST</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column: Active Cart & Fast Checkout Panel */}
      <div className="w-full lg:w-96 flex flex-col bg-white dark:bg-slate-850 rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-sm flex-shrink-0">
        {/* Customer Header */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-blue-600" />
            {selectedCustomer ? (
              <div className="truncate">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{selectedCustomer.name}</p>
                <p className="text-[10px] text-slate-400">{selectedCustomer.phone}</p>
              </div>
            ) : (
              <span className="text-xs font-semibold text-slate-500">Walk-in Customer</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="p-1 text-slate-400 hover:text-red-500 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={() => setShowCustomerModal(true)}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
            >
              {selectedCustomer ? 'Change' : '+ Add Customer'}
            </button>
          </div>
        </div>

        {/* Cart Line Items */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs py-12">
              <Barcode className="w-8 h-8 text-slate-300 mb-2" />
              <p>Cart is currently empty.</p>
              <p className="text-[10px] text-slate-400">Scan barcode or click items to add.</p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 flex-1 mr-2">
                  <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.productName}</p>
                  <p className="text-[10px] text-slate-400 font-mono">
                    {branding.currencySymbol}{item.unitPrice} × {item.quantity} {item.unit} (+{item.taxRate}% GST)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 overflow-hidden">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="px-2 font-bold text-xs">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="font-black text-xs min-w-[55px] text-right">
                    {branding.currencySymbol}{Math.round(item.totalAmount)}
                  </span>

                  <button
                    onClick={() => removeItem(idx)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-3 p-2 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Financial Summary & Payment Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 space-y-3">
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Subtotal</span>
              <span>{branding.currencySymbol}{Math.round(subtotal * 100) / 100}</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Total GST Tax</span>
              <span>{branding.currencySymbol}{Math.round(taxTotal * 100) / 100}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500">
              <span>Discount</span>
              <input
                type="number"
                value={discountAmount || ''}
                onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-20 px-2 py-0.5 rounded border text-right text-xs bg-white dark:bg-slate-800 font-bold"
              />
            </div>
            <div className="flex justify-between text-base font-black text-slate-900 dark:text-white pt-2 border-t border-slate-200 dark:border-slate-800">
              <span>Grand Total</span>
              <span className="text-blue-600 dark:text-blue-400">
                {branding.currencySymbol}{grandTotal}
              </span>
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="grid grid-cols-4 gap-1.5 pt-1 text-[11px] font-bold">
            <button
              onClick={() => setPaymentMethod('CASH')}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                paymentMethod === 'CASH'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <Banknote className="w-4 h-4" />
              <span>Cash</span>
            </button>
            <button
              onClick={() => setPaymentMethod('UPI')}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                paymentMethod === 'UPI'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <QrCode className="w-4 h-4" />
              <span>UPI / QR</span>
            </button>
            <button
              onClick={() => setPaymentMethod('CARD')}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                paymentMethod === 'CARD'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>Card</span>
            </button>
            <button
              onClick={() => setPaymentMethod('CREDIT')}
              className={`py-2 rounded-lg flex flex-col items-center gap-1 border transition-all ${
                paymentMethod === 'CREDIT'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Credit</span>
            </button>
          </div>

          {/* Cash Tendered & Change Due Input */}
          {paymentMethod === 'CASH' && (
            <div className="flex items-center gap-2 pt-1 text-xs">
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Tendered</label>
                <input
                  type="number"
                  value={cashTendered}
                  onChange={(e) => setCashTendered(e.target.value)}
                  placeholder={String(grandTotal)}
                  className="w-full px-2 py-1.5 rounded-lg border text-xs font-mono font-bold bg-white dark:bg-slate-800"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 font-semibold mb-0.5">Change Due</label>
                <div className="px-2 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-mono font-black text-xs">
                  {branding.currencySymbol}{changeDue}
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons: Hold & Complete Checkout */}
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleHoldCart}
              disabled={cart.length === 0}
              className="p-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
              title="Park / Hold Current Cart"
            >
              <Pause className="w-4 h-4" />
            </button>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>{isProcessing ? 'Processing Transaction...' : `Complete Sale (${branding.currencySymbol}${grandTotal})`}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customer Quick Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Select or Add Customer</h3>
              <button onClick={() => setShowCustomerModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Search by customer phone or name..."
                value={customerSearch}
                onChange={async (e) => {
                  setCustomerSearch(e.target.value);
                  const res: any = await api.get(`/customers?search=${encodeURIComponent(e.target.value)}`);
                  if (res.success) setCustomerList(res.data);
                }}
                className="w-full px-3 py-2 rounded-xl border text-xs bg-slate-50 dark:bg-slate-800"
              />
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {customerList.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCustomer(c); setShowCustomerModal(false); }}
                    className="py-2 px-1 cursor-pointer hover:bg-blue-50 dark:hover:bg-slate-800 flex justify-between"
                  >
                    <div>
                      <p className="font-bold">{c.name}</p>
                      <p className="text-[10px] text-slate-400">{c.phone}</p>
                    </div>
                    <span className="text-blue-600 font-semibold">{c.loyalty_points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Bills Modal */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Parked / Held Sales</h3>
              <button onClick={() => setShowHeldModal(false)}><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
              {heldBills.map((h) => (
                <div key={h.id} className="p-3 rounded-xl border flex items-center justify-between">
                  <div>
                    <p className="font-bold">{h.reference || h.invoiceNo}</p>
                    <p className="text-[10px] text-slate-400">{h.customerName || 'Walk-in'} • {h.items?.length} items</p>
                  </div>
                  <button
                    onClick={() => handleResumeBill(h)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Thermal Receipt Print Preview Modal */}
      {completedSale && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="text-center pb-3 border-b border-dashed border-slate-300">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="font-black text-base">{completedSale.business?.name || branding.appName}</h3>
              <p className="text-[10px] text-slate-500">{completedSale.branch?.name}</p>
              <p className="text-[10px] font-mono text-slate-500">Invoice: {completedSale.invoiceNo}</p>
              <p className="text-[10px] text-slate-400">{new Date(completedSale.createdAt).toLocaleString()}</p>
            </div>

            {/* Receipt Items */}
            <div className="text-xs space-y-1.5 max-h-48 overflow-y-auto font-mono py-1">
              {completedSale.items?.map((item: any, idx: number) => (
                <div key={idx} className="flex justify-between">
                  <span className="truncate max-w-[170px]">{item.productName} × {item.quantity}</span>
                  <span className="font-bold">{branding.currencySymbol}{Math.round(item.totalAmount)}</span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="border-t border-dashed border-slate-300 pt-2 text-xs space-y-1 font-mono">
              <div className="flex justify-between font-bold text-sm">
                <span>Grand Total</span>
                <span>{branding.currencySymbol}{completedSale.grandTotal}</span>
              </div>
              <div className="flex justify-between text-slate-500 text-[11px]">
                <span>Payment Method</span>
                <span>{completedSale.paymentMethod}</span>
              </div>
              {completedSale.paymentMethod === 'CASH' && (
                <>
                  <div className="flex justify-between text-slate-500 text-[11px]">
                    <span>Cash Tendered</span>
                    <span>{branding.currencySymbol}{completedSale.cashTendered}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-600 text-xs">
                    <span>Change Returned</span>
                    <span>{branding.currencySymbol}{completedSale.changeDue}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4" />
                <span>Print Thermal (80mm)</span>
              </button>
              <button
                onClick={() => setCompletedSale(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
