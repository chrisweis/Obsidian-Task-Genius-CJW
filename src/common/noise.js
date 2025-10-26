/**
 * Get noise SVG string
 */
export function noiseBackground() {
    return `<svg width="1901" height="961" viewBox="0 0 1901 961" fill="none" xmlns="http://www.w3.org/2000/svg">
	<g opacity="0.25" filter="url(#filter0_n_1_2)">
	<rect width="1901" height="961" fill="#EFEFEF"/>
	</g>
	<defs>
	<filter id="filter0_n_1_2" x="0" y="0" width="1901" height="961" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
	<feFlood flood-opacity="0" result="BackgroundImageFix"/>
	<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
	<feTurbulence type="fractalNoise" baseFrequency="1.25 1.25" stitchTiles="stitch" numOctaves="3" result="noise" seed="5339" />
	<feColorMatrix in="noise" type="luminanceToAlpha" result="alphaNoise" />
	<feComponentTransfer in="alphaNoise" result="coloredNoise1">
	<feFuncA type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "/>
		</feComponentTransfer>
		<feComposite operator="in" in2="shape" in="coloredNoise1" result="noise1Clipped" />
	<feFlood flood-color="rgba(0, 0, 0, 0.25)" result="color1Flood" />
	<feComposite operator="in" in2="noise1Clipped" in="color1Flood" result="color1" />
	<feMerge result="effect1_noise_1_2">
	<feMergeNode in="shape" />
	<feMergeNode in="color1" />
		</feMerge>
		</filter>
		</defs>
		</svg>`;
}
/**
 * Insert noise effect into the specified HTML element
 * @param container - Target container element
 * @param options - Configuration options
 */
export function insertNoise(container, options) {
    const { opacity = 0.25, position = 'absolute', zIndex = 1 } = options || {};
    // Create noise container
    const noiseLayer = container.createDiv('tg-noise-layer-inline');
    // Set styles
    noiseLayer.style.position = position;
    noiseLayer.style.top = '0';
    noiseLayer.style.left = '0';
    noiseLayer.style.width = '100%';
    noiseLayer.style.height = '100%';
    noiseLayer.style.pointerEvents = 'none';
    noiseLayer.style.opacity = opacity.toString();
    noiseLayer.style.zIndex = zIndex.toString();
    // Insert SVG
    noiseLayer.innerHTML = noiseBackground();
    // Insert noise layer at the first position of the container
    container.insertBefore(noiseLayer, container.firstChild);
    // Return noise element for easy removal later
    return noiseLayer;
}
/**
 * Remove noise effect added via insertNoise
 * @param container - Container element
 */
export function removeNoise(container) {
    const noiseLayer = container.querySelector('.tg-noise-layer-inline');
    if (noiseLayer) {
        noiseLayer.remove();
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9pc2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub2lzZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTs7R0FFRztBQUNILE1BQU0sVUFBVSxlQUFlO0lBQzlCLE9BQU87Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7U0FzQkMsQ0FBQztBQUNWLENBQUM7QUFFRDs7OztHQUlHO0FBQ0gsTUFBTSxVQUFVLFdBQVcsQ0FDMUIsU0FBc0IsRUFDdEIsT0FJQztJQUVELE1BQU0sRUFDTCxPQUFPLEdBQUcsSUFBSSxFQUNkLFFBQVEsR0FBRyxVQUFVLEVBQ3JCLE1BQU0sR0FBRyxDQUFDLEVBQ1YsR0FBRyxPQUFPLElBQUksRUFBRSxDQUFDO0lBRWxCLHlCQUF5QjtJQUN6QixNQUFNLFVBQVUsR0FBRyxTQUFTLENBQUMsU0FBUyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFFaEUsYUFBYTtJQUNiLFVBQVUsQ0FBQyxLQUFLLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztJQUNyQyxVQUFVLENBQUMsS0FBSyxDQUFDLEdBQUcsR0FBRyxHQUFHLENBQUM7SUFDM0IsVUFBVSxDQUFDLEtBQUssQ0FBQyxJQUFJLEdBQUcsR0FBRyxDQUFDO0lBQzVCLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxHQUFHLE1BQU0sQ0FBQztJQUNoQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDakMsVUFBVSxDQUFDLEtBQUssQ0FBQyxhQUFhLEdBQUcsTUFBTSxDQUFDO0lBQ3hDLFVBQVUsQ0FBQyxLQUFLLENBQUMsT0FBTyxHQUFHLE9BQU8sQ0FBQyxRQUFRLEVBQUUsQ0FBQztJQUM5QyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUMsUUFBUSxFQUFFLENBQUM7SUFFNUMsYUFBYTtJQUNiLFVBQVUsQ0FBQyxTQUFTLEdBQUcsZUFBZSxFQUFFLENBQUM7SUFFekMsNERBQTREO0lBQzVELFNBQVMsQ0FBQyxZQUFZLENBQUMsVUFBVSxFQUFFLFNBQVMsQ0FBQyxVQUFVLENBQUMsQ0FBQztJQUV6RCw4Q0FBOEM7SUFDOUMsT0FBTyxVQUFVLENBQUM7QUFDbkIsQ0FBQztBQUVEOzs7R0FHRztBQUNILE1BQU0sVUFBVSxXQUFXLENBQUMsU0FBc0I7SUFDakQsTUFBTSxVQUFVLEdBQUcsU0FBUyxDQUFDLGFBQWEsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0lBQ3JFLElBQUksVUFBVSxFQUFFO1FBQ2YsVUFBVSxDQUFDLE1BQU0sRUFBRSxDQUFDO0tBQ3BCO0FBQ0YsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgbm9pc2UgU1ZHIHN0cmluZ1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIG5vaXNlQmFja2dyb3VuZCgpIHtcclxuXHRyZXR1cm4gYDxzdmcgd2lkdGg9XCIxOTAxXCIgaGVpZ2h0PVwiOTYxXCIgdmlld0JveD1cIjAgMCAxOTAxIDk2MVwiIGZpbGw9XCJub25lXCIgeG1sbnM9XCJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2Z1wiPlxyXG5cdDxnIG9wYWNpdHk9XCIwLjI1XCIgZmlsdGVyPVwidXJsKCNmaWx0ZXIwX25fMV8yKVwiPlxyXG5cdDxyZWN0IHdpZHRoPVwiMTkwMVwiIGhlaWdodD1cIjk2MVwiIGZpbGw9XCIjRUZFRkVGXCIvPlxyXG5cdDwvZz5cclxuXHQ8ZGVmcz5cclxuXHQ8ZmlsdGVyIGlkPVwiZmlsdGVyMF9uXzFfMlwiIHg9XCIwXCIgeT1cIjBcIiB3aWR0aD1cIjE5MDFcIiBoZWlnaHQ9XCI5NjFcIiBmaWx0ZXJVbml0cz1cInVzZXJTcGFjZU9uVXNlXCIgY29sb3ItaW50ZXJwb2xhdGlvbi1maWx0ZXJzPVwic1JHQlwiPlxyXG5cdDxmZUZsb29kIGZsb29kLW9wYWNpdHk9XCIwXCIgcmVzdWx0PVwiQmFja2dyb3VuZEltYWdlRml4XCIvPlxyXG5cdDxmZUJsZW5kIG1vZGU9XCJub3JtYWxcIiBpbj1cIlNvdXJjZUdyYXBoaWNcIiBpbjI9XCJCYWNrZ3JvdW5kSW1hZ2VGaXhcIiByZXN1bHQ9XCJzaGFwZVwiLz5cclxuXHQ8ZmVUdXJidWxlbmNlIHR5cGU9XCJmcmFjdGFsTm9pc2VcIiBiYXNlRnJlcXVlbmN5PVwiMS4yNSAxLjI1XCIgc3RpdGNoVGlsZXM9XCJzdGl0Y2hcIiBudW1PY3RhdmVzPVwiM1wiIHJlc3VsdD1cIm5vaXNlXCIgc2VlZD1cIjUzMzlcIiAvPlxyXG5cdDxmZUNvbG9yTWF0cml4IGluPVwibm9pc2VcIiB0eXBlPVwibHVtaW5hbmNlVG9BbHBoYVwiIHJlc3VsdD1cImFscGhhTm9pc2VcIiAvPlxyXG5cdDxmZUNvbXBvbmVudFRyYW5zZmVyIGluPVwiYWxwaGFOb2lzZVwiIHJlc3VsdD1cImNvbG9yZWROb2lzZTFcIj5cclxuXHQ8ZmVGdW5jQSB0eXBlPVwiZGlzY3JldGVcIiB0YWJsZVZhbHVlcz1cIjEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDEgMSAxIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgMCAwIDAgXCIvPlxyXG5cdFx0PC9mZUNvbXBvbmVudFRyYW5zZmVyPlxyXG5cdFx0PGZlQ29tcG9zaXRlIG9wZXJhdG9yPVwiaW5cIiBpbjI9XCJzaGFwZVwiIGluPVwiY29sb3JlZE5vaXNlMVwiIHJlc3VsdD1cIm5vaXNlMUNsaXBwZWRcIiAvPlxyXG5cdDxmZUZsb29kIGZsb29kLWNvbG9yPVwicmdiYSgwLCAwLCAwLCAwLjI1KVwiIHJlc3VsdD1cImNvbG9yMUZsb29kXCIgLz5cclxuXHQ8ZmVDb21wb3NpdGUgb3BlcmF0b3I9XCJpblwiIGluMj1cIm5vaXNlMUNsaXBwZWRcIiBpbj1cImNvbG9yMUZsb29kXCIgcmVzdWx0PVwiY29sb3IxXCIgLz5cclxuXHQ8ZmVNZXJnZSByZXN1bHQ9XCJlZmZlY3QxX25vaXNlXzFfMlwiPlxyXG5cdDxmZU1lcmdlTm9kZSBpbj1cInNoYXBlXCIgLz5cclxuXHQ8ZmVNZXJnZU5vZGUgaW49XCJjb2xvcjFcIiAvPlxyXG5cdFx0PC9mZU1lcmdlPlxyXG5cdFx0PC9maWx0ZXI+XHJcblx0XHQ8L2RlZnM+XHJcblx0XHQ8L3N2Zz5gO1xyXG59XHJcblxyXG4vKipcclxuICogSW5zZXJ0IG5vaXNlIGVmZmVjdCBpbnRvIHRoZSBzcGVjaWZpZWQgSFRNTCBlbGVtZW50XHJcbiAqIEBwYXJhbSBjb250YWluZXIgLSBUYXJnZXQgY29udGFpbmVyIGVsZW1lbnRcclxuICogQHBhcmFtIG9wdGlvbnMgLSBDb25maWd1cmF0aW9uIG9wdGlvbnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpbnNlcnROb2lzZShcclxuXHRjb250YWluZXI6IEhUTUxFbGVtZW50LFxyXG5cdG9wdGlvbnM/OiB7XHJcblx0XHRvcGFjaXR5PzogbnVtYmVyOyAvLyBPcGFjaXR5LCBkZWZhdWx0IDAuMjVcclxuXHRcdHBvc2l0aW9uPzogJ2Fic29sdXRlJyB8ICdyZWxhdGl2ZSc7IC8vIFBvc2l0aW9uaW5nIG1ldGhvZCwgZGVmYXVsdCAnYWJzb2x1dGUnXHJcblx0XHR6SW5kZXg/OiBudW1iZXI7IC8vIHotaW5kZXggdmFsdWUsIGRlZmF1bHQgMVxyXG5cdH1cclxuKSB7XHJcblx0Y29uc3Qge1xyXG5cdFx0b3BhY2l0eSA9IDAuMjUsXHJcblx0XHRwb3NpdGlvbiA9ICdhYnNvbHV0ZScsXHJcblx0XHR6SW5kZXggPSAxXHJcblx0fSA9IG9wdGlvbnMgfHwge307XHJcblxyXG5cdC8vIENyZWF0ZSBub2lzZSBjb250YWluZXJcclxuXHRjb25zdCBub2lzZUxheWVyID0gY29udGFpbmVyLmNyZWF0ZURpdigndGctbm9pc2UtbGF5ZXItaW5saW5lJyk7XHJcblxyXG5cdC8vIFNldCBzdHlsZXNcclxuXHRub2lzZUxheWVyLnN0eWxlLnBvc2l0aW9uID0gcG9zaXRpb247XHJcblx0bm9pc2VMYXllci5zdHlsZS50b3AgPSAnMCc7XHJcblx0bm9pc2VMYXllci5zdHlsZS5sZWZ0ID0gJzAnO1xyXG5cdG5vaXNlTGF5ZXIuc3R5bGUud2lkdGggPSAnMTAwJSc7XHJcblx0bm9pc2VMYXllci5zdHlsZS5oZWlnaHQgPSAnMTAwJSc7XHJcblx0bm9pc2VMYXllci5zdHlsZS5wb2ludGVyRXZlbnRzID0gJ25vbmUnO1xyXG5cdG5vaXNlTGF5ZXIuc3R5bGUub3BhY2l0eSA9IG9wYWNpdHkudG9TdHJpbmcoKTtcclxuXHRub2lzZUxheWVyLnN0eWxlLnpJbmRleCA9IHpJbmRleC50b1N0cmluZygpO1xyXG5cclxuXHQvLyBJbnNlcnQgU1ZHXHJcblx0bm9pc2VMYXllci5pbm5lckhUTUwgPSBub2lzZUJhY2tncm91bmQoKTtcclxuXHJcblx0Ly8gSW5zZXJ0IG5vaXNlIGxheWVyIGF0IHRoZSBmaXJzdCBwb3NpdGlvbiBvZiB0aGUgY29udGFpbmVyXHJcblx0Y29udGFpbmVyLmluc2VydEJlZm9yZShub2lzZUxheWVyLCBjb250YWluZXIuZmlyc3RDaGlsZCk7XHJcblxyXG5cdC8vIFJldHVybiBub2lzZSBlbGVtZW50IGZvciBlYXN5IHJlbW92YWwgbGF0ZXJcclxuXHRyZXR1cm4gbm9pc2VMYXllcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIFJlbW92ZSBub2lzZSBlZmZlY3QgYWRkZWQgdmlhIGluc2VydE5vaXNlXHJcbiAqIEBwYXJhbSBjb250YWluZXIgLSBDb250YWluZXIgZWxlbWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZU5vaXNlKGNvbnRhaW5lcjogSFRNTEVsZW1lbnQpIHtcclxuXHRjb25zdCBub2lzZUxheWVyID0gY29udGFpbmVyLnF1ZXJ5U2VsZWN0b3IoJy50Zy1ub2lzZS1sYXllci1pbmxpbmUnKTtcclxuXHRpZiAobm9pc2VMYXllcikge1xyXG5cdFx0bm9pc2VMYXllci5yZW1vdmUoKTtcclxuXHR9XHJcbn1cclxuIl19