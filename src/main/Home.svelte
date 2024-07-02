<script>
	import { onMount } from "svelte";
	import BiggerPicture from "bigger-picture";
	import Macy from "macy";
	import "bigger-picture/css";

	let bp;

	onMount(() => {
		console.log('HOME');
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

<p>HOME</p>
<div id="images">
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/pinkHydrangea_1-500_10.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/pinkHydrangea_1-500_10.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_pinkHydrangea_1-500_10.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a pink hydrangea"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_pinkHydrangea_1-500_10.JPG"
	alt="Picture of a pink hydrangea"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/tinyFlowers_1-125_7.1.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/tinyFlowers_1-125_7.1.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_tinyFlowers_1-125_7.1.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of some tiny flowers"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_tinyFlowers_1-125_7.1.JPG"
	alt="Picture of some tiny flowers"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/gooddog.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/gooddog.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_gooddog.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a dawg"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_gooddog.JPG"
	alt="Picture of a dawg"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/bees_1-80_5.6.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/bees_1-80_5.6.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_bees_1-80_5.6.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of buzzing bees"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_bees_1-80_5.6.JPG"
	alt="Picture of buzzing bees"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/arf.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/arf.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_arf.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a dawg"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_arf.JPG"
	alt="Picture of a dawg"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/afterRain_1-640_10.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/afterRain_1-640_10.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_afterRain_1-640_10.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a purple hydrangea after rain"
	data-caption="A purple hydrangea after rain, with raindrops on the petals."
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_afterRain_1-640_10.JPG"
	alt="Picture of a purple hydrangea after rain"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/dawg_1-20_10.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/dawg_1-20_10.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_dawg_1-20_10.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a dog"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_dawg_1-20_10.JPG"
	alt="Picture of a dog"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/hydrangeaPair_1-640_10.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/hydrangeaPair_1-640_10.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hydrangeaPair_1-640_10.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a pink hydrangea"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hydrangeaPair_1-640_10.JPG"
	alt="Picture of a pink hydrangea"
	/>
</a>
<a
	href="https://photographyhobby.s3.us-east-2.amazonaws.com/notyetaflower_1-640_10.JPG"
	data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/notyetaflower_1-640_10.JPG"
	data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_notyetaflower_1-640_10.JPG"
	data-height="3456"
	data-width="5184"
	data-alt="Picture of a pink hydrangea"
>
	<img
	src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_notyetaflower_1-640_10.JPG"
	alt="Picture of a pink hydrangea"
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
