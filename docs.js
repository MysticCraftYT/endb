'use strict';

const Docma = require('docma');
const Package = require('./package');

Docma.create()
	.build({
		dest: './docs',
		debug: 16,
		app: {
			title: Package.name,
			meta: [
				{charset: 'utf-8'},
				{name: 'viewport', content: 'width=device-width,initial-scale=1.0'},
				{property: 'og:url', content: Package.homepage},
				{property: 'og:title', content: Package.name},
				{property: 'og:description', content: Package.description},
				{property: 'og:image', content: 'media/logo.png'}
			],
			base: '/',
			entrance: 'content:readme',
			server: Docma.ServerType.GITHUB
		},
		src: [{endb: Package.main}, {readme: './README.md'}],
		template: {
			options: {
				title: Package.name,
				navbar: true,
				navItems: [
					{
						label: 'README',
						href: '?content=readme',
						iconClass: 'ico-md ico-info'
					},
					{
						label: 'Documentation',
						href: `?api=${Package.name}`,
						iconClass: 'ico-book'
					},
					{
						label: 'GitHub',
						href: `https://github.com/${Package.repository}`,
						target: '_blank',
						iconClass: 'ico-md ico-github'
					}
				]
			}
		},
		markdown: {
			sanitize: false
		}
	})
	.then(() => console.log('Sucessfully built the documentation.'))
	.catch(console.error);
