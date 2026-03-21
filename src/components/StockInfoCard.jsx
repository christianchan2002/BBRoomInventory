function StockInfoCard({ item }) {
  return (
    <section className="stockCard">
      <div className="stockCardTitle">Scanned Item</div>
      <div className="stockName">{item?.itemName || '-'}</div>
      <div className="stockMeta">Category: {item?.category || '-'}</div>
      <div className="stockMeta">Current Qty: {item?.currentQty ?? '-'}</div>
    </section>
  );
}

export default StockInfoCard;
