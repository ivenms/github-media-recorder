import React from 'react';
import { render } from '@testing-library/react';
import MicIcon from '../../../src/components/icons/MicIcon';
import LibraryIcon from '../../../src/components/icons/LibraryIcon';
import VideoRecorderIcon from '../../../src/components/icons/VideoRecorderIcon';
import DefaultThumbnail from '../../../src/components/icons/DefaultThumbnail';
import PlayIcon from '../../../src/components/icons/PlayIcon';
import AudioIcon from '../../../src/components/icons/AudioIcon';
import CloseIcon from '../../../src/components/icons/CloseIcon';
import DeleteIcon from '../../../src/components/icons/DeleteIcon';
import EditIcon from '../../../src/components/icons/EditIcon';
import UploadIcon from '../../../src/components/icons/UploadIcon';
import VideoIcon from '../../../src/components/icons/VideoIcon';
import CheckIcon from '../../../src/components/icons/CheckIcon';
import RecordIcon from '../../../src/components/icons/RecordIcon';
import SettingsIcon from '../../../src/components/icons/SettingsIcon';
import SaveIcon from '../../../src/components/icons/SaveIcon';

describe('Icon Components', () => {
  describe('MicIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<MicIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<MicIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });

    it('has correct default dimensions', () => {
      const { container } = render(<MicIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '24');
      expect(svgElement).toHaveAttribute('height', '24');
    });
  });

  describe('LibraryIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<LibraryIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<LibraryIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('VideoRecorderIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<VideoRecorderIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<VideoRecorderIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('DefaultThumbnail', () => {
    it('renders without crashing', () => {
      const { container } = render(<DefaultThumbnail />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<DefaultThumbnail className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('PlayIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<PlayIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom dimensions', () => {
      const { container } = render(<PlayIcon width={32} height={32} />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '32');
      expect(svgElement).toHaveAttribute('height', '32');
    });

    it('applies custom className', () => {
      const { container } = render(<PlayIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('flex-shrink-0');
      expect(svgElement).toHaveClass('custom-class');
    });

    it('has default dimensions when not specified', () => {
      const { container } = render(<PlayIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '24');
      expect(svgElement).toHaveAttribute('height', '24');
    });
  });

  describe('AudioIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<AudioIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<AudioIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('CloseIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<CloseIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<CloseIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('DeleteIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<DeleteIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<DeleteIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('EditIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<EditIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<EditIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('UploadIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<UploadIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<UploadIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('VideoIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<VideoIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<VideoIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('CheckIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<CheckIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom dimensions', () => {
      const { container } = render(<CheckIcon width={20} height={20} />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '20');
      expect(svgElement).toHaveAttribute('height', '20');
    });

    it('applies custom className', () => {
      const { container } = render(<CheckIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('flex-shrink-0');
      expect(svgElement).toHaveClass('custom-class');
    });

    it('has default dimensions when not specified', () => {
      const { container } = render(<CheckIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveAttribute('width', '16');
      expect(svgElement).toHaveAttribute('height', '16');
    });

    it('applies minimum width and height styles', () => {
      const { container } = render(<CheckIcon width={20} height={20} />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveStyle('min-width: 20px');
      expect(svgElement).toHaveStyle('min-height: 20px');
    });
  });

  describe('RecordIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<RecordIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<RecordIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('SettingsIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<SettingsIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SettingsIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('SaveIcon', () => {
    it('renders without crashing', () => {
      const { container } = render(<SaveIcon />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toBeInTheDocument();
    });

    it('applies custom className', () => {
      const { container } = render(<SaveIcon className="custom-class" />);
      const svgElement = container.querySelector('svg');
      expect(svgElement).toHaveClass('custom-class');
    });
  });

  describe('Icon Component Consistency', () => {
    it('all icons render as SVG elements', () => {
      const icons = [
        { component: <MicIcon />, name: 'MicIcon' },
        { component: <LibraryIcon />, name: 'LibraryIcon' },
        { component: <VideoRecorderIcon />, name: 'VideoRecorderIcon' },
        { component: <DefaultThumbnail />, name: 'DefaultThumbnail' },
        { component: <PlayIcon />, name: 'PlayIcon' },
        { component: <AudioIcon />, name: 'AudioIcon' },
        { component: <CloseIcon />, name: 'CloseIcon' },
        { component: <DeleteIcon />, name: 'DeleteIcon' },
        { component: <EditIcon />, name: 'EditIcon' },
        { component: <UploadIcon />, name: 'UploadIcon' },
        { component: <VideoIcon />, name: 'VideoIcon' },
        { component: <CheckIcon />, name: 'CheckIcon' },
        { component: <RecordIcon />, name: 'RecordIcon' },
        { component: <SettingsIcon />, name: 'SettingsIcon' },
        { component: <SaveIcon />, name: 'SaveIcon' }
      ];

      icons.forEach(({ component, _name }) => {
        const { container, unmount } = render(component);
        const svgElement = container.querySelector('svg');
        expect(svgElement).toBeInTheDocument();
        expect(svgElement?.tagName).toBe('svg');
        unmount();
      });
    });

    it('all icons accept className prop', () => {
      const testClassName = 'test-icon-class';
      const icons = [
        { component: MicIcon, name: 'MicIcon' },
        { component: LibraryIcon, name: 'LibraryIcon' },
        { component: VideoRecorderIcon, name: 'VideoRecorderIcon' },
        { component: DefaultThumbnail, name: 'DefaultThumbnail' },
        { component: PlayIcon, name: 'PlayIcon' },
        { component: AudioIcon, name: 'AudioIcon' },
        { component: CloseIcon, name: 'CloseIcon' },
        { component: DeleteIcon, name: 'DeleteIcon' },
        { component: EditIcon, name: 'EditIcon' },
        { component: UploadIcon, name: 'UploadIcon' },
        { component: VideoIcon, name: 'VideoIcon' },
        { component: CheckIcon, name: 'CheckIcon' },
        { component: RecordIcon, name: 'RecordIcon' },
        { component: SettingsIcon, name: 'SettingsIcon' },
        { component: SaveIcon, name: 'SaveIcon' }
      ];

      icons.forEach(({ component: IconComponent, _name }) => {
        const { container, unmount } = render(<IconComponent className={testClassName} />);
        const svgElement = container.querySelector('svg');
        expect(svgElement).toHaveClass(testClassName);
        unmount();
      });
    });
  });
});