function QuantityPad({ onAdjust }) {
  return (
    <div className="quantityPad">
      <button className="padButton" onClick={() => onAdjust(-1)}>
        -1
      </button>
      <button className="padButton" onClick={() => onAdjust(1)}>
        +1
      </button>
      <button className="padButton" onClick={() => onAdjust(5)}>
        +5
      </button>
      <button className="padButton" onClick={() => onAdjust(10)}>
        +10
      </button>
    </div>
  );
}

export default QuantityPad;
