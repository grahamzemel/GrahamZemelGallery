<script>
	import "./main.scss";
	import { state } from "./store/states.js";
	import { onMount } from "svelte";
	import Home from "./main/Home.svelte";
	import FamilyFriends from "./main/FamilyFriends.svelte";
	import Animals from "./main/Animals.svelte";
	import Plants from "./main/Plants.svelte";
	import Other from "./main/Other.svelte";

	let page;
	let testing = false;
	let attemptingAccess = false;
	let enteredPassword = "";
	let isPasswordProtected = true;
	const correctPassword = process.env.FRIENDSANDFAMILY;

	$: if ($state) {
		page = $state[0].component.name;
		if (!testing) {
			if (page == "se") {
				page = "home";
			}
			if (page == "fe") {
				page = "plants";
			}
			if (page == "pe") {
				page = "animals";
			}
			if (page == "ke") {
				page = "other";
			}
			if (page == "be") {
				page = "family-friends";
			}
			// i have no clue why this is happening only in production but this works
		}
	}

	function navigateTo(page) {
		if (page === "family-friends" && isPasswordProtected) {
			attemptingAccess = true;
			return;
		}
		if (page == "home") {
			state.set([{ id: 0, component: Home }]);
		} else if (page == "family-friends") {
			state.set([{ id: 1, component: FamilyFriends }]);
		} else if (page == "plants") {
			state.set([{ id: 2, component: Plants }]);
		} else if (page == "animals") {
			state.set([{ id: 3, component: Animals }]);
		} else if (page == "other") {
			state.set([{ id: 4, component: Other }]);
		}
	}

	function checkPassword() {
		if (enteredPassword === correctPassword) {
			isPasswordProtected = false;
			attemptingAccess = false;
			navigateTo("family-friends");
		} else {
			alert("Incorrect password. Please try again.");
		}
	}

	function closeModal() {
		attemptingAccess = false;
	}

	onMount(() => {
		state.set([{ id: 0, component: Home }]);
	});

	function isActive(buttonPage) {
		console.log(page, buttonPage);
		return page === buttonPage ? "is-active" : "";
	}
</script>

<body class="container">
	<h1 class="title has-text-centered">Graham Zemel's Gallery</h1>
	<div class="box p-5 has-text-centered">
		<p>
			Welcome to my gallery! This is my personal photo gallery where I (<a
				href="https://grahamzemel.com">Graham Zemel</a
			>) upload my photos and share them with the world. I hope you enjoy
			the photos as much as I enjoyed taking them.
		</p>
		<br />
		<p>
			You can find the source code for this project on
			<a href="https://github.com/grahamzemel/quantum-gallery">GitHub</a>.
		</p>
	</div>
	<br />

	<div class="field has-addons has-addons-centered is-flex-wrap">
		<div class="control">
			<button
				class="button same-width-button ${isActive('plants')}"
				on:click={() => navigateTo("plants")}
			>
				Plants
			</button>
		</div>
		<div class="control">
			<button
				class="button same-width-button ${isActive('animals')}"
				on:click={() => navigateTo("animals")}
			>
				Animals
			</button>
		</div>
		<div class="control">
			<button
				class="button same-width-button ${isActive('home')}"
				on:click={() => navigateTo("home")}
			>
				Home
			</button>
		</div>
		<div class="control">
			<button
				class="button same-width-button ${isActive('family-friends')}"
				on:click={() => navigateTo("family-friends")}
			>
				Family & Friends
			</button>
		</div>
		<div class="control">
			<button
				class="button same-width-button ${isActive('other')}"
				on:click={() => navigateTo("other")}
			>
				Other
			</button>
		</div>
	</div>

	{#if page == "home"}
		<Home />
	{:else if page == "family-friends"}
		<FamilyFriends />
	{:else if page == "plants"}
		<Plants />
	{:else if page == "animals"}
		<Animals />
	{:else if page == "other"}
		<Other />
	{/if}

	{#if attemptingAccess}
		<div class="modal is-active">
			<div class="modal-background"></div>
			<div class="modal-content">
				<div class="box">
					<p>
						Please enter the password to access the Family & Friends
						page:
					</p>
					<input
						type="password"
						bind:value={enteredPassword}
						class="input"
					/>
					<button
						class="button is-primary mt-2"
						on:click={checkPassword}>Submit</button
					>
				</div>
			</div>
			<button
				class="modal-close is-large"
				aria-label="close"
				on:click={closeModal}
			></button>
		</div>
	{/if}

	<br />
	<div class="box p-5 has-text-centered">
		<p>
			All images are taken by me, Graham Zemel. If you would like to use
			any, you are welcome to do so, but please credit me and link back to
			my website.
		</p>
	</div>
</body>

<style>
	.modal.is-active {
		display: flex;
		align-items: center;
		justify-content: center;
	}
	/* Base styles */
	.field.has-addons.has-addons-centered {
		display: flex;
		justify-content: center;
		flex-wrap: wrap;
	}

	.control {
		margin: 5px;
	}

	/* Media queries for responsiveness */
	@media (max-width: 768px) {
		.field.has-addons.has-addons-centered {
			flex-direction: column;
			align-items: center;
		}

		.control {
			width: 100%;
			text-align: center;
		}

		.control button {
			width: 100%;
		}
	}
</style>
