import QuantityPad from './QuantityPad';

function ItemRow({ item, isActive, onAdjustQty, onSetQtyDirect, onQtyBlur, onRemove }) {
  return (
    <article className={`itemRow ${isActive ? 'itemRowActive' : ''}`} data-barcode={item.barcode}>
      <div className="itemTopRow">
        <div className="itemName">{item.itemName}</div>
        <div className="itemTopActions">
          <div className="itemCode">{item.barcode}</div>
          <button className="itemRemoveButton" onClick={onRemove} aria-label={`Remove ${item.itemName}`}>
            Remove
          </button>
        </div>
      </div>

      <div className="qtyRow">
        <label htmlFor={`qty-${item.barcode}`} className="qtyLabel">
          Qty
        </label>
        <input
          id={`qty-${item.barcode}`}
          className="qtyInput"
          type="number"
          min="1"
          inputMode="numeric"
          value={item.qty}
          onChange={(event) => onSetQtyDirect(item.barcode, event.target.value)}
          onBlur={() => onQtyBlur(item.barcode)}
        />
      </div>

      <QuantityPad onAdjust={(delta) => onAdjustQty(item.barcode, delta)} />
    </article>
  );
}

export default ItemRow;
