export const TimeWindowSelector = ({ value, onChange }) => {
  return (
    <div className="filter-section">
      <h3>Time Window</h3>
      <DatePicker
        selected={value.start}
        onChange={(date) => onChange({ ...value, start: date })}
        placeholderText="Start Date"
      />
      <DatePicker
        selected={value.end}
        onChange={(date) => onChange({ ...value, end: date })}
        placeholderText="End Date"
      />
    </div>
  );
}; 