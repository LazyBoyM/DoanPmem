export default function WorkspaceArt({ compact = false }) {
    return <div className={`workspace-art ${compact ? 'compact' : ''}`} aria-hidden="true">
        <span className="art-orbit orbit-one" /><span className="art-orbit orbit-two" />
        <span className="art-spark spark-one" /><span className="art-spark spark-two" />
        <span className="art-back-sheet" /><div className="art-document"><span className="art-doc-top"><i className="bi bi-mortarboard-fill" /><span /></span><span className="art-line long" /><span className="art-line" /><span className="art-line short" /><div className="art-bars"><span /><span /><span /><span /></div></div>
        <span className="art-token art-token-check"><i className="bi bi-check2" /></span><span className="art-token art-token-book"><i className="bi bi-book" /></span>
    </div>;
}
