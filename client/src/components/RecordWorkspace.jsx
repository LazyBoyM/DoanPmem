export default function RecordWorkspace({ heading, filters, filterTitle = 'Tra cứu hồ sơ', sheetTitle = 'Danh sách hồ sơ', summary, children }) {
    return <div className="record-workspace">
        <header className="record-heading">{heading}</header>
        <div className="record-layout">
            <aside className="record-index" aria-label={filterTitle}><h2>{filterTitle}</h2><div className="record-filters">{filters}</div><p className="record-index-note">Chọn phạm vi ở đây, thao tác trực tiếp trên từng bản ghi.</p></aside>
            <section className="record-sheet" aria-label={sheetTitle}><header className="record-sheet-heading"><h2>{sheetTitle}</h2>{summary && <div className="record-count">{summary}</div>}</header>{children}</section>
        </div>
    </div>;
}
