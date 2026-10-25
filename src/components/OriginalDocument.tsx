export function OriginalDocument({
  url,
  filename,
}: {
  url: string;
  filename: string;
}) {
  return (
    <section className="source-document" aria-labelledby="source-heading">
      <div className="section-heading">
        <div>
          <p className="eyebrow">YOUR SOURCE OF TRUTH</p>
          <h2 id="source-heading">Original homework</h2>
        </div>
        <span className="file-name">{filename}</span>
      </div>
      <div className="source-image-wrap">
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Open original image"
        >
          <img
            src={url}
            alt="Original uploaded homework for comparison with the AI transcription"
          />
        </a>
      </div>
      <p className="muted small">
        Compare the explanation with the teacher’s actual note. Tap the image to
        view it full size.
      </p>
    </section>
  );
}
