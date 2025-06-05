import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Editor } from '@tiptap/react';
import { 
  X, Search, Star, Clock, Hash, Calculator, DollarSign, 
  ArrowRight, Smile, Type, Heart, Zap, Globe, Target
} from 'lucide-react';

interface SpecialCharactersProps {
  editor: Editor;
  isOpen: boolean;
  onClose: () => void;
}

interface Character {
  symbol: string;
  name: string;
  unicode: string;
  category: string;
}

interface CharacterCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  characters: Character[];
}

export const SpecialCharacters: React.FC<SpecialCharactersProps> = ({
  editor,
  isOpen,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('recently-used');
  const [recentlyUsed, setRecentlyUsed] = useState<Character[]>([]);
  const [favorites, setFavorites] = useState<Character[]>([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Character data
  const categories: CharacterCategory[] = [
    {
      id: 'recently-used',
      name: 'Recently Used',
      icon: <Clock size={16} />,
      characters: recentlyUsed
    },
    {
      id: 'favorites',
      name: 'Favorites',
      icon: <Star size={16} />,
      characters: favorites
    },
    {
      id: 'symbols',
      name: 'Symbols',
      icon: <Hash size={16} />,
      characters: [
        { symbol: '©', name: 'Copyright', unicode: 'U+00A9', category: 'symbols' },
        { symbol: '®', name: 'Registered', unicode: 'U+00AE', category: 'symbols' },
        { symbol: '™', name: 'Trademark', unicode: 'U+2122', category: 'symbols' },
        { symbol: '§', name: 'Section', unicode: 'U+00A7', category: 'symbols' },
        { symbol: '¶', name: 'Paragraph', unicode: 'U+00B6', category: 'symbols' },
        { symbol: '†', name: 'Dagger', unicode: 'U+2020', category: 'symbols' },
        { symbol: '‡', name: 'Double Dagger', unicode: 'U+2021', category: 'symbols' },
        { symbol: '•', name: 'Bullet', unicode: 'U+2022', category: 'symbols' },
        { symbol: '‰', name: 'Per Mille', unicode: 'U+2030', category: 'symbols' },
        { symbol: '‱', name: 'Per Ten Thousand', unicode: 'U+2031', category: 'symbols' },
        { symbol: '‹', name: 'Left Angle Quote', unicode: 'U+2039', category: 'symbols' },
        { symbol: '›', name: 'Right Angle Quote', unicode: 'U+203A', category: 'symbols' },
        { symbol: '«', name: 'Left Guillemet', unicode: 'U+00AB', category: 'symbols' },
        { symbol: '»', name: 'Right Guillemet', unicode: 'U+00BB', category: 'symbols' },
        { symbol: '\u2018', name: 'Left Single Quote', unicode: 'U+2018', category: 'symbols' },
        { symbol: '\u2019', name: 'Right Single Quote', unicode: 'U+2019', category: 'symbols' },
        { symbol: '\u201C', name: 'Left Double Quote', unicode: 'U+201C', category: 'symbols' },
        { symbol: '\u201D', name: 'Right Double Quote', unicode: 'U+201D', category: 'symbols' },
        { symbol: '…', name: 'Ellipsis', unicode: 'U+2026', category: 'symbols' },
        { symbol: '–', name: 'En Dash', unicode: 'U+2013', category: 'symbols' },
        { symbol: '—', name: 'Em Dash', unicode: 'U+2014', category: 'symbols' },
        { symbol: '¡', name: 'Inverted Exclamation', unicode: 'U+00A1', category: 'symbols' },
        { symbol: '¿', name: 'Inverted Question', unicode: 'U+00BF', category: 'symbols' },
        { symbol: '★', name: 'Star', unicode: 'U+2605', category: 'symbols' },
        { symbol: '☆', name: 'White Star', unicode: 'U+2606', category: 'symbols' },
        { symbol: '♠', name: 'Spade', unicode: 'U+2660', category: 'symbols' },
        { symbol: '♣', name: 'Club', unicode: 'U+2663', category: 'symbols' },
        { symbol: '♥', name: 'Heart', unicode: 'U+2665', category: 'symbols' },
        { symbol: '♦', name: 'Diamond', unicode: 'U+2666', category: 'symbols' },
        { symbol: '✓', name: 'Check Mark', unicode: 'U+2713', category: 'symbols' },
        { symbol: '✗', name: 'X Mark', unicode: 'U+2717', category: 'symbols' },
        { symbol: '⚠', name: 'Warning', unicode: 'U+26A0', category: 'symbols' },
        { symbol: '⚡', name: 'Lightning', unicode: 'U+26A1', category: 'symbols' },
        { symbol: '☀', name: 'Sun', unicode: 'U+2600', category: 'symbols' },
        { symbol: '☁', name: 'Cloud', unicode: 'U+2601', category: 'symbols' },
        { symbol: '☂', name: 'Umbrella', unicode: 'U+2602', category: 'symbols' },
        { symbol: '❤', name: 'Red Heart', unicode: 'U+2764', category: 'symbols' },
        { symbol: '❗', name: 'Exclamation', unicode: 'U+2757', category: 'symbols' },
        { symbol: '❓', name: 'Question', unicode: 'U+2753', category: 'symbols' },
        { symbol: '⭐', name: 'White Medium Star', unicode: 'U+2B50', category: 'symbols' },
        { symbol: '🔥', name: 'Fire', unicode: 'U+1F525', category: 'symbols' }
      ]
    },
    {
      id: 'math',
      name: 'Mathematics',
      icon: <Calculator size={16} />,
      characters: [
        { symbol: '±', name: 'Plus Minus', unicode: 'U+00B1', category: 'math' },
        { symbol: '×', name: 'Multiplication', unicode: 'U+00D7', category: 'math' },
        { symbol: '÷', name: 'Division', unicode: 'U+00F7', category: 'math' },
        { symbol: '≠', name: 'Not Equal', unicode: 'U+2260', category: 'math' },
        { symbol: '≈', name: 'Approximately', unicode: 'U+2248', category: 'math' },
        { symbol: '≡', name: 'Identical', unicode: 'U+2261', category: 'math' },
        { symbol: '≤', name: 'Less Equal', unicode: 'U+2264', category: 'math' },
        { symbol: '≥', name: 'Greater Equal', unicode: 'U+2265', category: 'math' },
        { symbol: '∞', name: 'Infinity', unicode: 'U+221E', category: 'math' },
        { symbol: '∑', name: 'Sum', unicode: 'U+2211', category: 'math' },
        { symbol: '∏', name: 'Product', unicode: 'U+220F', category: 'math' },
        { symbol: '∫', name: 'Integral', unicode: 'U+222B', category: 'math' },
        { symbol: '∂', name: 'Partial Derivative', unicode: 'U+2202', category: 'math' },
        { symbol: '∆', name: 'Delta', unicode: 'U+2206', category: 'math' },
        { symbol: '∇', name: 'Nabla', unicode: 'U+2207', category: 'math' },
        { symbol: '√', name: 'Square Root', unicode: 'U+221A', category: 'math' },
        { symbol: '∝', name: 'Proportional', unicode: 'U+221D', category: 'math' },
        { symbol: '∠', name: 'Angle', unicode: 'U+2220', category: 'math' },
        { symbol: '⊥', name: 'Perpendicular', unicode: 'U+22A5', category: 'math' },
        { symbol: '∥', name: 'Parallel', unicode: 'U+2225', category: 'math' },
        { symbol: '∈', name: 'Element Of', unicode: 'U+2208', category: 'math' },
        { symbol: '∉', name: 'Not Element Of', unicode: 'U+2209', category: 'math' },
        { symbol: '⊂', name: 'Subset', unicode: 'U+2282', category: 'math' },
        { symbol: '⊃', name: 'Superset', unicode: 'U+2283', category: 'math' },
        { symbol: '∩', name: 'Intersection', unicode: 'U+2229', category: 'math' },
        { symbol: '∪', name: 'Union', unicode: 'U+222A', category: 'math' },
        { symbol: '∅', name: 'Empty Set', unicode: 'U+2205', category: 'math' },
        { symbol: 'π', name: 'Pi', unicode: 'U+03C0', category: 'math' },
        { symbol: 'θ', name: 'Theta', unicode: 'U+03B8', category: 'math' },
        { symbol: 'λ', name: 'Lambda', unicode: 'U+03BB', category: 'math' },
        { symbol: 'μ', name: 'Mu', unicode: 'U+03BC', category: 'math' },
        { symbol: 'σ', name: 'Sigma', unicode: 'U+03C3', category: 'math' },
        { symbol: 'Ω', name: 'Omega', unicode: 'U+03A9', category: 'math' },
        { symbol: 'α', name: 'Alpha', unicode: 'U+03B1', category: 'math' },
        { symbol: 'β', name: 'Beta', unicode: 'U+03B2', category: 'math' },
        { symbol: 'γ', name: 'Gamma', unicode: 'U+03B3', category: 'math' },
        { symbol: 'δ', name: 'Delta', unicode: 'U+03B4', category: 'math' },
        { symbol: '∀', name: 'For All', unicode: 'U+2200', category: 'math' },
        { symbol: '∃', name: 'There Exists', unicode: 'U+2203', category: 'math' },
        { symbol: '¬', name: 'Not', unicode: 'U+00AC', category: 'math' }
      ]
    },
    {
      id: 'currency',
      name: 'Currency',
      icon: <DollarSign size={16} />,
      characters: [
        { symbol: '$', name: 'Dollar', unicode: 'U+0024', category: 'currency' },
        { symbol: '€', name: 'Euro', unicode: 'U+20AC', category: 'currency' },
        { symbol: '£', name: 'Pound', unicode: 'U+00A3', category: 'currency' },
        { symbol: '¥', name: 'Yen', unicode: 'U+00A5', category: 'currency' },
        { symbol: '₹', name: 'Rupee', unicode: 'U+20B9', category: 'currency' },
        { symbol: '₽', name: 'Ruble', unicode: 'U+20BD', category: 'currency' },
        { symbol: '₩', name: 'Won', unicode: 'U+20A9', category: 'currency' },
        { symbol: '₪', name: 'Shekel', unicode: 'U+20AA', category: 'currency' },
        { symbol: '₦', name: 'Naira', unicode: 'U+20A6', category: 'currency' },
        { symbol: '₡', name: 'Colon', unicode: 'U+20A1', category: 'currency' },
        { symbol: '₫', name: 'Dong', unicode: 'U+20AB', category: 'currency' },
        { symbol: '₱', name: 'Peso', unicode: 'U+20B1', category: 'currency' },
        { symbol: '₹', name: 'Indian Rupee', unicode: 'U+20B9', category: 'currency' },
        { symbol: '₺', name: 'Turkish Lira', unicode: 'U+20BA', category: 'currency' },
        { symbol: '＄', name: 'Fullwidth Dollar', unicode: 'U+FF04', category: 'currency' },
        { symbol: '¢', name: 'Cent', unicode: 'U+00A2', category: 'currency' },
        { symbol: '¤', name: 'Currency', unicode: 'U+00A4', category: 'currency' },
        { symbol: '₠', name: 'ECU', unicode: 'U+20A0', category: 'currency' },
        { symbol: '₢', name: 'Cruzeiro', unicode: 'U+20A2', category: 'currency' },
        { symbol: '₣', name: 'French Franc', unicode: 'U+20A3', category: 'currency' },
        { symbol: '₤', name: 'Lira', unicode: 'U+20A4', category: 'currency' },
        { symbol: '₥', name: 'Mill', unicode: 'U+20A5', category: 'currency' },
        { symbol: '₧', name: 'Peseta', unicode: 'U+20A7', category: 'currency' },
        { symbol: '₨', name: 'Rupee', unicode: 'U+20A8', category: 'currency' },
        { symbol: '€', name: 'Shekel', unicode: 'U+20AC', category: 'currency' }
      ]
    },
    {
      id: 'arrows',
      name: 'Arrows',
      icon: <ArrowRight size={16} />,
      characters: [
        { symbol: '←', name: 'Left Arrow', unicode: 'U+2190', category: 'arrows' },
        { symbol: '→', name: 'Right Arrow', unicode: 'U+2192', category: 'arrows' },
        { symbol: '↑', name: 'Up Arrow', unicode: 'U+2191', category: 'arrows' },
        { symbol: '↓', name: 'Down Arrow', unicode: 'U+2193', category: 'arrows' },
        { symbol: '↔', name: 'Left Right Arrow', unicode: 'U+2194', category: 'arrows' },
        { symbol: '↕', name: 'Up Down Arrow', unicode: 'U+2195', category: 'arrows' },
        { symbol: '↖', name: 'Up Left Arrow', unicode: 'U+2196', category: 'arrows' },
        { symbol: '↗', name: 'Up Right Arrow', unicode: 'U+2197', category: 'arrows' },
        { symbol: '↘', name: 'Down Right Arrow', unicode: 'U+2198', category: 'arrows' },
        { symbol: '↙', name: 'Down Left Arrow', unicode: 'U+2199', category: 'arrows' },
        { symbol: '⇐', name: 'Left Double Arrow', unicode: 'U+21D0', category: 'arrows' },
        { symbol: '⇒', name: 'Right Double Arrow', unicode: 'U+21D2', category: 'arrows' },
        { symbol: '⇑', name: 'Up Double Arrow', unicode: 'U+21D1', category: 'arrows' },
        { symbol: '⇓', name: 'Down Double Arrow', unicode: 'U+21D3', category: 'arrows' },
        { symbol: '⇔', name: 'Left Right Double Arrow', unicode: 'U+21D4', category: 'arrows' },
        { symbol: '⇕', name: 'Up Down Double Arrow', unicode: 'U+21D5', category: 'arrows' },
        { symbol: '➜', name: 'Heavy Right Arrow', unicode: 'U+279C', category: 'arrows' },
        { symbol: '➤', name: 'Black Right Triangle', unicode: 'U+27A4', category: 'arrows' },
        { symbol: '↩', name: 'Left Hook Arrow', unicode: 'U+21A9', category: 'arrows' },
        { symbol: '↪', name: 'Right Hook Arrow', unicode: 'U+21AA', category: 'arrows' },
        { symbol: '⤴', name: 'Up Right Hook Arrow', unicode: 'U+2934', category: 'arrows' },
        { symbol: '⤵', name: 'Down Right Hook Arrow', unicode: 'U+2935', category: 'arrows' },
        { symbol: '↶', name: 'Anticlockwise Top Semicircle', unicode: 'U+21B6', category: 'arrows' },
        { symbol: '↷', name: 'Clockwise Top Semicircle', unicode: 'U+21B7', category: 'arrows' },
        { symbol: '⟲', name: 'Anticlockwise Open Circle', unicode: 'U+27F2', category: 'arrows' },
        { symbol: '⟳', name: 'Clockwise Open Circle', unicode: 'U+27F3', category: 'arrows' }
      ]
    },
    {
      id: 'emoji',
      name: 'Emoji',
      icon: <Smile size={16} />,
      characters: [
        { symbol: '😀', name: 'Grinning Face', unicode: 'U+1F600', category: 'emoji' },
        { symbol: '😃', name: 'Grinning Face with Big Eyes', unicode: 'U+1F603', category: 'emoji' },
        { symbol: '😄', name: 'Grinning Face with Smiling Eyes', unicode: 'U+1F604', category: 'emoji' },
        { symbol: '😁', name: 'Beaming Face with Smiling Eyes', unicode: 'U+1F601', category: 'emoji' },
        { symbol: '😆', name: 'Grinning Squinting Face', unicode: 'U+1F606', category: 'emoji' },
        { symbol: '😅', name: 'Grinning Face with Sweat', unicode: 'U+1F605', category: 'emoji' },
        { symbol: '😂', name: 'Face with Tears of Joy', unicode: 'U+1F602', category: 'emoji' },
        { symbol: '🤣', name: 'Rolling on the Floor Laughing', unicode: 'U+1F923', category: 'emoji' },
        { symbol: '😊', name: 'Smiling Face with Smiling Eyes', unicode: 'U+1F60A', category: 'emoji' },
        { symbol: '😇', name: 'Smiling Face with Halo', unicode: 'U+1F607', category: 'emoji' },
        { symbol: '🙂', name: 'Slightly Smiling Face', unicode: 'U+1F642', category: 'emoji' },
        { symbol: '🙃', name: 'Upside-Down Face', unicode: 'U+1F643', category: 'emoji' },
        { symbol: '😉', name: 'Winking Face', unicode: 'U+1F609', category: 'emoji' },
        { symbol: '😌', name: 'Relieved Face', unicode: 'U+1F60C', category: 'emoji' },
        { symbol: '😍', name: 'Smiling Face with Heart-Eyes', unicode: 'U+1F60D', category: 'emoji' },
        { symbol: '🥰', name: 'Smiling Face with Hearts', unicode: 'U+1F970', category: 'emoji' },
        { symbol: '😘', name: 'Face Blowing a Kiss', unicode: 'U+1F618', category: 'emoji' },
        { symbol: '😗', name: 'Kissing Face', unicode: 'U+1F617', category: 'emoji' },
        { symbol: '😙', name: 'Kissing Face with Smiling Eyes', unicode: 'U+1F619', category: 'emoji' },
        { symbol: '😚', name: 'Kissing Face with Closed Eyes', unicode: 'U+1F61A', category: 'emoji' },
        { symbol: '😋', name: 'Face Savoring Food', unicode: 'U+1F60B', category: 'emoji' },
        { symbol: '😛', name: 'Face with Tongue', unicode: 'U+1F61B', category: 'emoji' },
        { symbol: '😜', name: 'Winking Face with Tongue', unicode: 'U+1F61C', category: 'emoji' },
        { symbol: '🤪', name: 'Zany Face', unicode: 'U+1F92A', category: 'emoji' },
        { symbol: '😝', name: 'Squinting Face with Tongue', unicode: 'U+1F61D', category: 'emoji' },
        { symbol: '🤑', name: 'Money-Mouth Face', unicode: 'U+1F911', category: 'emoji' },
        { symbol: '🤗', name: 'Hugging Face', unicode: 'U+1F917', category: 'emoji' },
        { symbol: '🤭', name: 'Face with Hand Over Mouth', unicode: 'U+1F92D', category: 'emoji' },
        { symbol: '🤫', name: 'Shushing Face', unicode: 'U+1F92B', category: 'emoji' },
        { symbol: '🤔', name: 'Thinking Face', unicode: 'U+1F914', category: 'emoji' },
        { symbol: '🤐', name: 'Zipper-Mouth Face', unicode: 'U+1F910', category: 'emoji' },
        { symbol: '🤨', name: 'Face with Raised Eyebrow', unicode: 'U+1F928', category: 'emoji' },
        { symbol: '😐', name: 'Neutral Face', unicode: 'U+1F610', category: 'emoji' },
        { symbol: '😑', name: 'Expressionless Face', unicode: 'U+1F611', category: 'emoji' },
        { symbol: '😶', name: 'Face Without Mouth', unicode: 'U+1F636', category: 'emoji' },
        { symbol: '😏', name: 'Smirking Face', unicode: 'U+1F60F', category: 'emoji' },
        { symbol: '😒', name: 'Unamused Face', unicode: 'U+1F612', category: 'emoji' },
        { symbol: '🙄', name: 'Face with Rolling Eyes', unicode: 'U+1F644', category: 'emoji' },
        { symbol: '😬', name: 'Grimacing Face', unicode: 'U+1F62C', category: 'emoji' },
        { symbol: '🤥', name: 'Lying Face', unicode: 'U+1F925', category: 'emoji' },
        { symbol: '😔', name: 'Pensive Face', unicode: 'U+1F614', category: 'emoji' },
        { symbol: '😪', name: 'Sleepy Face', unicode: 'U+1F62A', category: 'emoji' },
        { symbol: '🤤', name: 'Drooling Face', unicode: 'U+1F924', category: 'emoji' },
        { symbol: '😴', name: 'Sleeping Face', unicode: 'U+1F634', category: 'emoji' },
        { symbol: '😷', name: 'Face with Medical Mask', unicode: 'U+1F637', category: 'emoji' },
        { symbol: '🤒', name: 'Face with Thermometer', unicode: 'U+1F912', category: 'emoji' },
        { symbol: '🤕', name: 'Face with Head-Bandage', unicode: 'U+1F915', category: 'emoji' },
        { symbol: '🤢', name: 'Nauseated Face', unicode: 'U+1F922', category: 'emoji' },
        { symbol: '🤮', name: 'Face Vomiting', unicode: 'U+1F92E', category: 'emoji' },
        { symbol: '🤧', name: 'Sneezing Face', unicode: 'U+1F927', category: 'emoji' },
        { symbol: '🥵', name: 'Hot Face', unicode: 'U+1F975', category: 'emoji' },
        { symbol: '🥶', name: 'Cold Face', unicode: 'U+1F976', category: 'emoji' },
        { symbol: '🥴', name: 'Woozy Face', unicode: 'U+1F974', category: 'emoji' },
        { symbol: '😵', name: 'Dizzy Face', unicode: 'U+1F635', category: 'emoji' },
        { symbol: '🤯', name: 'Exploding Head', unicode: 'U+1F92F', category: 'emoji' },
        { symbol: '🥳', name: 'Partying Face', unicode: 'U+1F973', category: 'emoji' },
        { symbol: '😎', name: 'Smiling Face with Sunglasses', unicode: 'U+1F60E', category: 'emoji' },
        { symbol: '🤓', name: 'Nerd Face', unicode: 'U+1F913', category: 'emoji' },
        { symbol: '🧐', name: 'Face with Monocle', unicode: 'U+1F9D0', category: 'emoji' },
        { symbol: '😕', name: 'Confused Face', unicode: 'U+1F615', category: 'emoji' },
        { symbol: '😟', name: 'Worried Face', unicode: 'U+1F61F', category: 'emoji' },
        { symbol: '🙁', name: 'Slightly Frowning Face', unicode: 'U+1F641', category: 'emoji' },
        { symbol: '☹', name: 'Frowning Face', unicode: 'U+2639', category: 'emoji' },
        { symbol: '😮', name: 'Face with Open Mouth', unicode: 'U+1F62E', category: 'emoji' },
        { symbol: '😯', name: 'Hushed Face', unicode: 'U+1F62F', category: 'emoji' },
        { symbol: '😲', name: 'Astonished Face', unicode: 'U+1F632', category: 'emoji' },
        { symbol: '😳', name: 'Flushed Face', unicode: 'U+1F633', category: 'emoji' },
        { symbol: '🥺', name: 'Pleading Face', unicode: 'U+1F97A', category: 'emoji' },
        { symbol: '😦', name: 'Frowning Face with Open Mouth', unicode: 'U+1F626', category: 'emoji' },
        { symbol: '😧', name: 'Anguished Face', unicode: 'U+1F627', category: 'emoji' },
        { symbol: '😨', name: 'Fearful Face', unicode: 'U+1F628', category: 'emoji' },
        { symbol: '😰', name: 'Anxious Face with Sweat', unicode: 'U+1F630', category: 'emoji' },
        { symbol: '😥', name: 'Sad but Relieved Face', unicode: 'U+1F625', category: 'emoji' },
        { symbol: '😢', name: 'Crying Face', unicode: 'U+1F622', category: 'emoji' },
        { symbol: '😭', name: 'Loudly Crying Face', unicode: 'U+1F62D', category: 'emoji' },
        { symbol: '😱', name: 'Face Screaming in Fear', unicode: 'U+1F631', category: 'emoji' },
        { symbol: '😖', name: 'Confounded Face', unicode: 'U+1F616', category: 'emoji' },
        { symbol: '😣', name: 'Persevering Face', unicode: 'U+1F623', category: 'emoji' },
        { symbol: '😞', name: 'Disappointed Face', unicode: 'U+1F61E', category: 'emoji' },
        { symbol: '😓', name: 'Downcast Face with Sweat', unicode: 'U+1F613', category: 'emoji' },
        { symbol: '😩', name: 'Weary Face', unicode: 'U+1F629', category: 'emoji' },
        { symbol: '😫', name: 'Tired Face', unicode: 'U+1F62B', category: 'emoji' },
        { symbol: '😤', name: 'Face with Steam From Nose', unicode: 'U+1F624', category: 'emoji' },
        { symbol: '😡', name: 'Pouting Face', unicode: 'U+1F621', category: 'emoji' },
        { symbol: '😠', name: 'Angry Face', unicode: 'U+1F620', category: 'emoji' },
        { symbol: '🤬', name: 'Face with Symbols on Mouth', unicode: 'U+1F92C', category: 'emoji' },
        { symbol: '😈', name: 'Smiling Face with Horns', unicode: 'U+1F608', category: 'emoji' },
        { symbol: '👿', name: 'Angry Face with Horns', unicode: 'U+1F47F', category: 'emoji' },
        { symbol: '💀', name: 'Skull', unicode: 'U+1F480', category: 'emoji' },
        { symbol: '☠', name: 'Skull and Crossbones', unicode: 'U+2620', category: 'emoji' }
      ]
    }
  ];

  // Focus search input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Load favorites and recently used from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('specialCharactersFavorites');
    const savedRecentlyUsed = localStorage.getItem('specialCharactersRecentlyUsed');
    
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.warn('Failed to parse saved favorites');
      }
    }
    
    if (savedRecentlyUsed) {
      try {
        setRecentlyUsed(JSON.parse(savedRecentlyUsed));
      } catch (e) {
        console.warn('Failed to parse saved recently used');
      }
    }
  }, []);

  // Save to localStorage when favorites or recently used change
  useEffect(() => {
    localStorage.setItem('specialCharactersFavorites', JSON.stringify(favorites));
  }, [favorites]);

  useEffect(() => {
    localStorage.setItem('specialCharactersRecentlyUsed', JSON.stringify(recentlyUsed));
  }, [recentlyUsed]);

  // Get filtered characters based on search and category
  const getFilteredCharacters = useCallback(() => {
    const selectedCat = categories.find(cat => cat.id === selectedCategory);
    if (!selectedCat) return [];
    
    let chars = selectedCat.characters;
    
    // If searching, include characters from all categories
    if (searchTerm.trim()) {
      chars = categories.flatMap(cat => cat.characters).filter(char =>
        char.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        char.symbol.includes(searchTerm) ||
        char.unicode.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    return chars;
  }, [selectedCategory, searchTerm, categories]);

  // Insert character into editor
  const insertCharacter = useCallback((character: Character) => {
    if (!editor) return;
    
    editor.chain().focus().insertContent(character.symbol).run();
    
    // Add to recently used (limit to 20 characters)
    setRecentlyUsed(prev => {
      const filtered = prev.filter(char => char.symbol !== character.symbol);
      return [character, ...filtered].slice(0, 20);
    });
    
    // Close modal after insertion
    onClose();
  }, [editor, onClose]);

  // Toggle favorite
  const toggleFavorite = useCallback((character: Character) => {
    setFavorites(prev => {
      const exists = prev.some(char => char.symbol === character.symbol);
      if (exists) {
        return prev.filter(char => char.symbol !== character.symbol);
      } else {
        return [...prev, character];
      }
    });
  }, []);

  // Check if character is favorited
  const isFavorite = useCallback((character: Character) => {
    return favorites.some(char => char.symbol === character.symbol);
  }, [favorites]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;
      
      const characters = getFilteredCharacters();
      
      if (event.key === 'Escape') {
        onClose();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        setFocusedIndex(prev => Math.min(prev + 1, characters.length - 1));
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        setFocusedIndex(prev => Math.max(prev - 1, 0));
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        // Calculate grid columns (approximately 8 per row)
        const cols = 8;
        setFocusedIndex(prev => Math.min(prev + cols, characters.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        const cols = 8;
        setFocusedIndex(prev => Math.max(prev - cols, 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < characters.length) {
          insertCharacter(characters[focusedIndex]);
        }
      } else if (event.key === 'f' && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < characters.length) {
          toggleFavorite(characters[focusedIndex]);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, focusedIndex, getFilteredCharacters, insertCharacter, toggleFavorite, onClose]);

  // Reset focused index when category or search changes
  useEffect(() => {
    setFocusedIndex(-1);
  }, [selectedCategory, searchTerm]);

  if (!isOpen) return null;

  const filteredCharacters = getFilteredCharacters();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div 
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Type size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Special Characters</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 text-gray-500"
          >
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search characters by name, symbol, or unicode..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Category Sidebar */}
          <div className="w-48 border-r border-gray-200 bg-gray-50">
            <div className="p-2">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-sm ${
                    selectedCategory === category.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {category.icon}
                  <span>{category.name}</span>
                  {category.characters.length > 0 && (
                    <span className="ml-auto text-xs text-gray-500">
                      {category.characters.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Character Grid */}
          <div className="flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-900">
                  {searchTerm ? `Search Results (${filteredCharacters.length})` : 
                   categories.find(cat => cat.id === selectedCategory)?.name}
                </h3>
                {filteredCharacters.length > 0 && (
                  <div className="text-sm text-gray-500">
                    Use arrow keys to navigate, Enter to insert, Ctrl+F to favorite
                  </div>
                )}
              </div>
            </div>

            <div 
              ref={gridRef}
              className="flex-1 overflow-auto p-4"
            >
              {filteredCharacters.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <Type size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">No characters found</p>
                  <p className="text-sm">Try a different search term or category</p>
                </div>
              ) : (
                <div className="grid grid-cols-8 gap-2">
                  {filteredCharacters.map((character, index) => (
                    <div
                      key={`${character.symbol}-${character.unicode}`}
                      className={`relative group cursor-pointer p-3 rounded-lg border-2 transition-all duration-200 ${
                        index === focusedIndex
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => insertCharacter(character)}
                      title={`${character.name} (${character.unicode})`}
                    >
                      {/* Character Symbol */}
                      <div className="text-2xl text-center mb-1">
                        {character.symbol}
                      </div>
                      
                      {/* Character Name */}
                      <div className="text-xs text-gray-600 text-center truncate">
                        {character.name}
                      </div>
                      
                      {/* Favorite Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(character);
                        }}
                        className={`absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity ${
                          isFavorite(character)
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : 'text-gray-400 hover:text-gray-600'
                        }`}
                        title={isFavorite(character) ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star size={12} fill={isFavorite(character) ? 'currentColor' : 'none'} />
                      </button>
                      
                      {/* Tooltip on hover */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {character.name}
                        <br />
                        <span className="text-gray-300">{character.unicode}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center space-x-4">
              <span>💡 Tip: Use search to find specific characters quickly</span>
            </div>
            <div className="flex items-center space-x-4">
              <span>Recently used: {recentlyUsed.length}</span>
              <span>Favorites: {favorites.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}; 