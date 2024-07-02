<script>
	import { onMount } from "svelte";
	import BiggerPicture from "bigger-picture";
	import Macy from "macy";
	import "bigger-picture/css";

	let bp;

	onMount(() => {
		console.log('FAMILY & FRIENDS');

		bp = BiggerPicture({
			target: document.body,
		});
		let imageLinks = document.querySelectorAll("#images > a");
		for (let link of imageLinks) {
			link.addEventListener("click", openGallery);
		}
		function openGallery(e) {
			e.preventDefault();
			bp.open({
				items: imageLinks,
				el: e.currentTarget,
			});
		}
Macy({
  container: "#images",
  trueOrder: true,
  margin: 4,
  columns: 3,
  breakAt: {
    520: {
      columns: 2
    }
  }
});
	});
</script>

<div id="images">
<a
	href="https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash.jpg 1667w"
	data-thumb="https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg"
	data-height="2500"
	data-width="1667"
	data-alt="Antelope Canyon"
>
	<img
	src="https://assets.henrygd.me/bp/images/joshua-sukoff-sZ5zbZMAYJs-unsplash_thumb.jpg"
	alt="Antelope Canyon"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash.jpg 2400w"
	data-thumb="https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg"
	data-height="2400"
	data-width="2400"
	data-alt="brown and white mountain under gray sky"
>
	<img
	src="https://assets.henrygd.me/bp/images/daniel-sessler-5El_7dJ0kKo-unsplash_thumb.jpg"
	alt="brown and white mountain under gray sky"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash.jpg 3000w"
	data-thumb="https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg"
	data-height="2000"
	data-width="3000"
	data-alt="wildlife photography of brown bear cub"
>
	<img
	src="https://assets.henrygd.me/bp/images/janko-ferlic-SDivo1PTBDs-unsplash_thumb.jpg"
	alt="wildlife photography of brown bear cub"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash.jpg 3000w"
	data-thumb="https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg"
	data-height="2000"
	data-width="3000"
	data-alt="green-and-brown palm trees under clear blue sky"
>
	<img
	src="https://assets.henrygd.me/bp/images/corey-agopian-5y4ljzRrDFA-unsplash_thumb.jpg"
	alt="green-and-brown palm trees under clear blue sky"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash.jpg 1667w"
	data-thumb="https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg"
	data-height="2500"
	data-width="1667"
	data-alt="close up of a yellow and blue macaw"
>
	<img
	src="https://assets.henrygd.me/bp/images/andrew-pons-lylCw4zcA7I-unsplash_thumb.jpg"
	alt="close up of a yellow and blue macaw"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg"
	data-img="https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_1500.jpg 1500w, https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU.jpg 2400w"
	data-thumb="https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg"
	data-height="2400"
	data-width="2400"
	data-alt="mountains clouded in purple fog"
>
	<img
	src="https://assets.henrygd.me/bp/images/veeterzy-EYcvA56gSjU_thumb.jpg"
	alt="mountains clouded in purple fog"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_1500.jpg 1500w, https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash.jpg 2400w"
	data-thumb="https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg"
	data-height="2400"
	data-width="2400"
	data-alt="three brown leopards hiding on grass field during daytime"
>
	<img
	src="https://assets.henrygd.me/bp/images/harshil-gudka-9GptkQwAAsc-unsplash_thumb.jpg"
	alt="three brown leopards hiding on grass field during daytime"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_1800.jpg 1800w, https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash.jpg 3000w"
	data-thumb="https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg"
	data-height="2000"
	data-width="3000"
	data-alt="people stand under unique trees on socotra"
>
	<img
	src="https://assets.henrygd.me/bp/images/andrew-svk-REwZEYzw19g-unsplash_thumb.jpg"
	alt="people stand under unique trees on socotra"
	/>
</a>
<a
	href="https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg"
	data-img="https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_1133.jpg 1133w, https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash.jpg 1667w"
	data-thumb="https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg"
	data-height="2500"
	data-width="1667"
	data-alt="two brown deer beside trees and mountain"
>
	<img
	src="https://assets.henrygd.me/bp/images/johannes-andersson-UCd78vfC8vU-unsplash_thumb.jpg"
	alt="two brown deer beside trees and mountain"
	/>
</a>
</div>

<style>
	p {
		color: darkslategray;
	}

	* {
		box-sizing: border-box;
	}

	body {
		margin: 0;
		padding: 8px;
	}

	.inline-gallery {
		position: relative;
		background: #222;
		overflow: hidden;
	}
	.inline-gallery:before {
		content: "";
		padding-bottom: 66.66%;
		display: block;
	}
</style>
