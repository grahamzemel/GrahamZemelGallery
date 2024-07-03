<script>
	import { onMount } from "svelte";
	import BiggerPicture from "bigger-picture";
	import Macy from "macy";
	import "bigger-picture/css";

	let bp;

	onMount(() => {
		console.log('OTHER');
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
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/smileyface.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/smileyface.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_smileyface.jpg"
		data-height="3456"
		data-width="5184"
		data-alt="Picture of a smiley face made from fireworks"
		data-caption="This firework reminded me of a smiley face :)."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_smileyface.jpg"
		alt="Picture of a smiley face made from fireworks"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/purpleexposure.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/purpleexposure.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_purpleexposure.jpg"
		data-height="1943"
		data-width="2914"
		data-alt="A firework that looks like a purple flower in the sky."
		data-caption="This firework looked like a purple flower in the sky to me, and the long shutter speed made it really neat."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_purpleexposure.jpg"
		alt="A firework that looks like a purple flower in the sky."
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/firework.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/firework.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_firework.jpg"
		data-height="5184"
		data-width="3456"
		data-alt="A nice singular photo of a firework"
		data-caption="A pretty nice photo of a firework, if I do say so myself."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_firework.jpg"
		alt="Picture of some tiny flowers"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/fireworks!.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/fireworks!.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_fireworks!.jpg"
		data-height="5184"
		data-width="3456"
		data-alt="A picture of two fireworks"
		data-caption="The kickoff! These were the first two fireworks of the night."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_fireworks!.jpg"
		alt="A picture of two fireworks"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/hacker.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/hacker.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hacker.jpg"
		data-height="3456"
		data-width="3456"
		data-alt="Picture of a firework that looks like that hacking scene from the matrix."
		data-caption="When I took this picture, I thought it looked a bit like the falling green text from the matrix due to the long shutter speed."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_hacker.jpg"
		alt="Picture of a firework that looks like that hacking scene from the matrix."
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/littlebitoeverything.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/littlebitoeverything.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_littlebitoeverything.jpg"
		data-height="5184"
		data-width="3456"
		data-alt="Picture of a bunch of fireworks"
		data-caption="Another picture of a bunch of fireworks, this one looked particularly interesting to me because of the long shutter speed."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_littlebitoeverything.jpg"
		alt="Picture of a bunch of fireworks"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/monster.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/monster.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_monster.jpg"
		data-height="3456"
		data-width="5184"
		data-alt="A picture of a bunch of fireworks that looks like a monster"
		data-caption="For some reason, this one reminded me of some sort of monster from a child's imagination, with the brightest orbs as eyes and the line of fireworks as a mouth."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_monster.jpg"
		alt="A picture of a bunch of fireworks that looks like a monster"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/planets.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/planets.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_planets.jpg"
		data-height="3456"
		data-width="3456"
		data-alt="Picture of fireworks in an arrangement of planets"
		data-caption="A bunch of circular fireworks that reminded me of planets in a solar system."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_planets.jpg"
		alt="Picture of fireworks in an arrangement of planets"
		/>
	</a>
	<a
		href="https://photographyhobby.s3.us-east-2.amazonaws.com/skyflower.jpg"
		data-img="https://photographyhobby.s3.us-east-2.amazonaws.com/skyflower.jpg"
		data-thumb="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_skyflower.jpg"
		data-height="3456"
		data-width="5184"
		data-alt="A firework that looks like a flower"
		data-caption="This firework looked like a flower to me."
	>
		<img
		src="https://photographyhobby.s3.us-east-2.amazonaws.com/thumbnail_skyflower.jpg"
		alt="A firework that looks like a flower"
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
