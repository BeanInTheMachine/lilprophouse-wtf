export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="homeGradientBg homeHeroWrap">
        <div className="container mx-auto px-4">
          <div className="flex min-h-[75vh] homeHeroContent">
            <div className="w-full lg:w-8/12 pt-8 lg:pt-0 flex flex-col justify-center">
              <h1 className="font-bold text-6xl text-brand-black">Prop House</h1>
              <p className="text-[25px] text-brand-gray mt-2 max-w-xl">
                A simple and fun way to award people onchain. Set up a round, tell the internet and watch magic happen.
              </p>
              <div className="flex gap-3 mt-4">
                <a href="/create/round" className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-base font-bold text-brand-black bg-white border border-border-med hover:text-brand-gray transition-colors no-underline">
                  Create a round
                </a>
                <a href="/app" className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-base font-bold text-white bg-brand-pink hover:bg-brand-pink-semi-transparent transition-colors no-underline">
                  View rounds
                </a>
              </div>
            </div>
          </div>
        </div>
        <img src="/Props_FIN11.png" alt="" className="homeHeaderImg hidden lg:block" />
      </section>

      {/* Stats Section */}
      <div className="break-out bg-brand-purple relative homeStatsContainer">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 128 1440 192" className="w-full block" style={{ backgroundColor: '#dbd3fd' }}>
          <path fillOpacity=".1" fill="#8a2be2" d="M0,160L80,176C160,192,320,224,480,218.7C640,213,800,171,960,154.7C1120,139,1280,149,1360,154.7L1440,160L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z" />
        </svg>
        <div className="container mx-auto px-4 py-8">
          <div className="homeStatsFlex">
            {[
              { stat: '$3M+', label: 'USD awarded' },
              { stat: '300+', label: 'rounds executed' },
              { stat: '8k+', label: 'proposals submitted' },
              { stat: '25k+', label: 'votes cast' },
            ].map((item) => (
              <div key={item.label} className="homeStatItem">
                <span className="homeStatNumber">{item.stat}</span>
                <span className="homeStatLabel">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 230" className="w-full bg-white block">
          <path fillOpacity="1" fill="#8a2be2" d="M0,96L80,112C160,128,320,160,480,154.7C640,149,800,107,960,112C1120,117,1280,171,1360,197.3L1440,224L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z" />
        </svg>
      </div>

      {/* Born in Nouns */}
      <section className="break-out bg-white overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="homeCityTitleCol lg:w-6/12 py-8 text-center lg:text-left">
              <h2 className="font-bold text-[40px] text-brand-black">Born in Nouns</h2>
              <p className="text-lg text-brand-gray mt-2 max-w-md">
                Prop House is a project born and funded by Nouns. It serves as an open invitation for all onchain communities to build the world they want to see.
              </p>
            </div>
            <div className="lg:w-6/12 overflow-visible">
              <img src="/ph-city.png" alt="onchain city" className="homeCityImg" />
            </div>
          </div>
        </div>
      </section>

      {/* Empower Builders */}
      <section className="pt-8 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-center mb-8">
            <img src="/alien.png" alt="" className="max-w-[50vh] w-auto relative z-[2]" />
          </div>
          <h2 className="font-bold text-[40px] text-center text-brand-black mb-8">Empower builders</h2>
          <div className="homeFeaturesGrid">
            {[
              { title: 'Make it fun', desc: 'Turn your boring bounty or grants program into a fun experience builders and voters can enjoy.' },
              { title: 'Awards', desc: 'Use any type of asset to award builders - ETH, USDC or NFTs (and more). Anything to get the people going.' },
              { title: 'Cross pollinate', desc: 'Let builders from all corners of Ethereum build for your community.' },
              { title: 'Transparent', desc: 'Allow builders to see how winners are decided on through simple and transparent voting.' },
              { title: 'Onchain & open source', desc: 'From round creation to award claiming — the entire Prop House stack is onchain and open source.' },
              { title: 'Simple', desc: 'Enjoy an intuitive interface that makes clunky crypto apps a thing of the past.' },
            ].map((feature) => (
              <div key={feature.title} className="homeFeatureItem">
                <b>{feature.title}</b>
                <span>{feature.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hand & Moon wave */}
      <div className="break-out relative" style={{ minHeight: '10vh' }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 230" className="w-full block">
          <path fillOpacity=".1" fill="#8a2be2" d="M0,96L60,117.3C120,139,240,181,360,170.7C480,160,600,96,720,90.7C840,85,960,139,1080,144C1200,149,1320,107,1380,85.3L1440,64L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z" />
        </svg>
        <div className="homeHandMoonWrap">
          <img src="/hand.png" alt="" className="homeHand" />
          <img src="/moon.png" alt="" className="homeMoon" />
        </div>
      </div>

      {/* Explore Now */}
      <div className="break-out bg-brand-purple homeExploreSection">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-bold text-[40px] text-white mb-2">Explore now</h2>
          <p className="text-lg text-white/80 mb-6">Discover what&apos;s being built with Prop House</p>
          <a href="/app" className="inline-flex items-center justify-center rounded-[10px] px-3 py-1.5 text-base font-bold text-white bg-brand-pink hover:bg-brand-pink-semi-transparent transition-colors no-underline">
            Explore rounds
          </a>
        </div>
      </div>
    </div>
  );
}
