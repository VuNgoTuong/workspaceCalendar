import Lightbox, { type Slide } from 'yet-another-react-lightbox';
import Fullscreen from 'yet-another-react-lightbox/plugins/fullscreen';
import Zoom from 'yet-another-react-lightbox/plugins/zoom';
import Thumbnails from 'yet-another-react-lightbox/plugins/thumbnails';
import Captions from 'yet-another-react-lightbox/plugins/captions';
import 'yet-another-react-lightbox/styles.css';
import 'yet-another-react-lightbox/plugins/thumbnails.css';
import 'yet-another-react-lightbox/plugins/captions.css';

interface AppLightboxProps {
  index: number;
  slides: Slide[];
  onClose: () => void;
}

export const AppLightbox: React.FC<AppLightboxProps> = ({ index, slides, onClose }) => (
  <Lightbox
    open
    close={onClose}
    index={index}
    slides={slides}
    plugins={[Fullscreen, Zoom, Thumbnails, Captions]}
    zoom={{ maxZoomPixelRatio: 4, scrollToZoom: true }}
    carousel={{ finite: slides.length <= 1 }}
  />
);

export default AppLightbox;
