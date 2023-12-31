import HomeFilters from "@/components/home/HomeFilters";
import CustomBtn from "@/components/shared/CustomBtn";
import NoResult from "@/components/shared/NoResult";
import Filters from "@/components/shared/filters/Filters";
import QuestionCard from "@/components/shared/cards/QuestionCard";
import LocalSearchbar from "@/components/shared/search/LocalSearchbar";
import { HomePageFilters } from "@/contants/filters";

import React from "react";
import { getQuestions } from "@/lib/actions/question.action";

const Home = async () => {
  const result = await getQuestions({});
  const allQuestions = result.questions;

  return (
    <>
      <div className="flex w-full flex-col-reverse justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="h1-bold text-dark100_light900">All Questions</h1>
        <CustomBtn
          route="ask-question"
          label="Ask a Question"
          linkClasses="justify-end"
          btnClasses="primary-gradient"
        />
      </div>

      <div className="mt-11 flex justify-between gap-5 max-sm:flex-col sm:items-center">
        <LocalSearchbar
          route="/"
          iconPosition="left"
          imgSrc="/assets/icons/search.svg"
          placeholder="Search Question..."
          otherClasses="flex"
        />
        <Filters
          filters={HomePageFilters}
          otherClasses="min-h-[56px] sm:min-w-[170px]"
          containerClasses="hidden max-md:flex"
        />
      </div>

      <HomeFilters />

      <div className="mt-10 flex w-full flex-col gap-6">
        {allQuestions.length > 0 ? (
          allQuestions.map((question, index) => (
            <QuestionCard
              key={index}
              _id={question._id}
              title={question.title}
              tags={question.tags}
              author={question.author}
              upvotes={question.upvotes}
              views={question.views}
              answers={question.answers}
              createdAt={question.createdAt}
            />
          ))
        ) : (
          <div className="flex-center text-dark400_light500 mt-10 w-full">
            <NoResult
              title="There&#39;s no question to show"
              description="Be the first to break the silence! 🚀 Ask a Question and kickstart the
            discussion. our query could be the next big thing others learn from. Get
            involved! 💡"
              link="ask-question"
              linkTitle="Ask a Question"
            />
          </div>
        )}
      </div>
    </>
  );
};

export default Home;
