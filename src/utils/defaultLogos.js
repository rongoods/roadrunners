import dark1 from '../assets/spinner/dark_1.jpg';
import dark2 from '../assets/spinner/dark_2.jpg';
import dark3 from '../assets/spinner/dark_3.jpg';
import dark4 from '../assets/spinner/dark_4.jpg';
import dark5 from '../assets/spinner/dark_5.jpg';
import dark6 from '../assets/spinner/dark_6.jpg';
import dark7 from '../assets/spinner/dark_7.jpg';
import dark8 from '../assets/spinner/dark_8.jpg';
import dark9 from '../assets/spinner/dark_9.jpg';
import light1 from '../assets/spinner/light_1.jpg';
import light2 from '../assets/spinner/light_2.png';
import light3 from '../assets/spinner/light_3.jpg';
import light4 from '../assets/spinner/light_4.jpg';
import light5 from '../assets/spinner/light_5.jpg';
import light6 from '../assets/spinner/light_6.jpg';
import light7 from '../assets/spinner/light_7.jpg';
import light8 from '../assets/spinner/light_8.jpg';
import light9 from '../assets/spinner/light_9.jpg';
import light10 from '../assets/spinner/light_10.jpg';

const LOGOS = [
    dark1, dark2, dark3, dark4, dark5, dark6, dark7, dark8, dark9,
    light1, light2, light3, light4, light5, light6, light7, light8, light9, light10
];

/**
 * Returns a consistent logo for a given userId.
 * @param {string} userId 
 * @returns {string} Image path
 */
export function getDefaultLogo(userId) {
    if (!userId) return LOGOS[0];

    // Simple hash function for consistent selection
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % LOGOS.length;
    return LOGOS[index];
}
