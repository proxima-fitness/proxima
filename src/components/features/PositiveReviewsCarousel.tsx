"use client";

/*
 * @module PositiveReviewsCarousel
 * @description Mobile horizontal carousel of Reddit community testimonials.
 * @dependsOn react-slick, RedditReviewCard, redditQuotes.
 * @usedBy PositiveReviewsMosaic (mobile layout).
 */

import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

import Slider from "react-slick";
import { RedditReviewCard } from "./RedditReviewCard";
import type { TRedditQuote } from "./redditQuotes";

interface IPositiveReviewsCarouselProps {
  quotes: readonly TRedditQuote[];
}

export function PositiveReviewsCarousel({ quotes }: IPositiveReviewsCarouselProps) {
  const settings = {
    speed: 500,
    draggable: true,
    easing: "linear",
    slidesToShow: 1,
    slidesToScroll: 1,
    dots: true,
    infinite: false,
    initialSlide: 0,
  };

  return (
    <div className="reddit-reviews-carousel px-6">
      <Slider {...settings}>
        {quotes.map((item) => (
          <div key={item.author} className="px-1 pb-2">
            <RedditReviewCard author={item.author} quote={item.quote} />
          </div>
        ))}
      </Slider>
    </div>
  );
}
