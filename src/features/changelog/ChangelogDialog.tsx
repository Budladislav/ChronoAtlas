import { changelog } from '../../data/changelog'
import { Modal } from '../../shared/Modal'

export function ChangelogDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="История изменений" onClose={onClose} size="small">
      <div className="modal__body changelog">
        {changelog.map((release) => (
          <section key={release.version}>
            <div className="release-heading"><strong>Версия {release.version}</strong><span>{release.date}</span></div>
            <ul>{release.changes.map((change) => <li key={change}>{change}</li>)}</ul>
          </section>
        ))}
      </div>
    </Modal>
  )
}
