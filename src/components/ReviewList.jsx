function ReviewList({ items, onRemoveRow }) {
  if (items.length === 0) {
    return <div className="emptyList">No items scanned yet.</div>;
  }

  return (
    <div className="reviewList">
      {items.map((item) => (
        <div key={item.barcode} className="reviewRow">
          <div className="reviewName">{item.itemName}</div>
          <div className="reviewQty">Qty {item.qty}</div>
          <button
            className="removeButton"
            onClick={() => onRemoveRow(item.barcode)}
            aria-label={`Remove ${item.itemName}`}
          >
            Remove
          </button>
        </div>
      ))}
    </div>
  );
}

export default ReviewList;
