const splitRegex = /([\u073C\u193A \u00A0]+)/g;
const dotRegex = /\u073C|\u193A/;

function cleanupDots(line) {
    const split = line.split(splitRegex);
    for (let i = 0; i < split.length; i++) {
        const part = split[i];
        if (!splitRegex.test(part)) continue;

        let width = 0;
        let leftDot = false;
        let upDot = false;
        for (let j = 0; j < part.length; j++) {
            const char = part.at(j);

            if (j == 0) {
                leftDot = dotRegex.test(char);
                if (leftDot) upDot = char == '\u193A';
            } else if (!leftDot && j == part.length - 1)
                upDot = char == '\u193A';

            switch (char) {
                case '\u073C':
                    width += 1;
                    break;
                case '\u193A':
                    width += 2;
                    break;
                case ' ':
                    width += 4;
                    break;
                case '\u00A0':
                    width += 5;
                    break;
            }
        }

        let filler = getGapFiller(width);
        if (leftDot) filler = filler.split('').reverse().join('');
        if (upDot) filler = filler.replace('\u073C\u073C', '\u193A');
        split[i] = filler;
    }
    
    return split.join('');
}

function getGapFiller(width) {
    if (width <= 0) return '';

    switch (width) {
        case 1: return '\u073C';
        case 2: return '\u073C\u073C';
        case 3: return '\u073C\u073C\u073C';
        case 6: return '\u00A0\u073C';
        case 7: return '\u00A0\u073C\u073C';
        case 11: return '\u00A0\u00A0\u073C';
        default: {
            let filler = '';
            while (width % 5 != 0) {
                filler += ' ';
                width -= 4;
            }
            while (width > 0) {
                filler += '\u00A0';
                width -= 5;
            }
            return filler;
        }
    }
}